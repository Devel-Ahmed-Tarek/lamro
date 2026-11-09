<?php

namespace App\Services;

use App\Events\AuctionEnded;
use App\Events\AuctionExtended;
use App\Events\BidPlaced;
use App\Models\Auction;
use App\Models\AuctionApplication;
use App\Models\AuctionProxy;
use App\Models\Bid;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlaceBidService
{
    public function __construct(private InventoryService $inventory) {}

    public function place(Auction $auction, User $user, int $amountCents, bool $fromProxy = false): Bid
    {
        return $this->withLock($auction->id, function () use ($auction, $user, $amountCents, $fromProxy) {
            $auction = Auction::query()->lockForUpdate()->findOrFail($auction->id);

            $this->assertCanBid($auction, $user);

            $minimum = $auction->current_price_cents + ($auction->bids()->exists() ? $auction->increment_cents : 0);
            if ($amountCents < $minimum) {
                throw ValidationException::withMessages([
                    'amount' => ["Bid must be at least {$minimum} cents."],
                ]);
            }

            if ($auction->buy_now_cents !== null && $amountCents >= $auction->buy_now_cents) {
                return $this->buyNowLocked($auction, $user);
            }

            $bid = $this->insertBid($auction, $user, $amountCents, $fromProxy);
            $this->touchAuctionAfterBid($auction, $bid);
            $this->resolveProxies($auction, $user->id);

            return $bid->fresh()->load('user');
        });
    }

    public function setProxy(Auction $auction, User $user, int $maxAmountCents): AuctionProxy
    {
        return $this->withLock($auction->id, function () use ($auction, $user, $maxAmountCents) {
            $auction = Auction::query()->lockForUpdate()->findOrFail($auction->id);
            $this->assertCanBid($auction, $user);

            $minimum = $auction->current_price_cents + ($auction->bids()->exists() ? $auction->increment_cents : 0);
            if ($maxAmountCents < $minimum) {
                throw ValidationException::withMessages([
                    'max_amount' => ['Maximum bid is too low.'],
                ]);
            }

            $proxy = AuctionProxy::query()->updateOrCreate(
                ['auction_id' => $auction->id, 'user_id' => $user->id],
                ['max_amount_cents' => $maxAmountCents, 'is_active' => true],
            );

            $leading = $auction->bids()->with('user')->latest('id')->first();
            if (! $leading || $leading->user_id !== $user->id) {
                $target = min($maxAmountCents, max($minimum, ($leading?->amount_cents ?? $auction->current_price_cents) + $auction->increment_cents));
                if ($target <= $maxAmountCents && $target >= $minimum) {
                    $bid = $this->insertBid($auction, $user, $target, true);
                    $this->touchAuctionAfterBid($auction, $bid);
                    $this->resolveProxies($auction, $user->id);
                }
            }

            return $proxy->fresh();
        });
    }

    public function cancelProxy(Auction $auction, User $user): void
    {
        AuctionProxy::query()
            ->where('auction_id', $auction->id)
            ->where('user_id', $user->id)
            ->update(['is_active' => false]);
    }

    public function buyNow(Auction $auction, User $user): Bid
    {
        return $this->withLock($auction->id, function () use ($auction, $user) {
            $auction = Auction::query()->lockForUpdate()->findOrFail($auction->id);
            $this->assertCanBid($auction, $user);

            if ($auction->buy_now_cents === null) {
                throw ValidationException::withMessages([
                    'buy_now' => ['Buy now is not available.'],
                ]);
            }

            if ($auction->current_price_cents >= $auction->buy_now_cents && $auction->bids()->exists()) {
                throw ValidationException::withMessages([
                    'buy_now' => ['Buy now is no longer available.'],
                ]);
            }

            return $this->buyNowLocked($auction, $user);
        });
    }

    public function openDue(): int
    {
        $count = 0;
        Auction::query()
            ->where('status', 'scheduled')
            ->whereNotNull('starts_at')
            ->where('starts_at', '<=', now())
            ->orderBy('id')
            ->each(function (Auction $auction) use (&$count) {
                $auction->update(['status' => 'live']);
                $count++;
            });

        return $count;
    }

    public function closeDue(): int
    {
        $count = 0;
        Auction::query()
            ->where('status', 'live')
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->orderBy('id')
            ->each(function (Auction $auction) use (&$count) {
                $this->withLock($auction->id, function () use ($auction, &$count) {
                    $fresh = Auction::query()->lockForUpdate()->find($auction->id);
                    if (! $fresh || $fresh->status !== 'live' || ! $fresh->ends_at || $fresh->ends_at->isFuture()) {
                        return;
                    }
                    $this->endAuction($fresh, 'timed_out');
                    $count++;
                });
            });

        return $count;
    }

    public function forceEnd(Auction $auction, string $reason = 'admin_ended'): Auction
    {
        return $this->withLock($auction->id, function () use ($auction, $reason) {
            $fresh = Auction::query()->lockForUpdate()->findOrFail($auction->id);
            if ($fresh->status !== 'live') {
                return $fresh;
            }
            $this->endAuction($fresh, $reason);

            return $fresh->fresh();
        });
    }

    /** @template T
     * @param  callable(): T  $callback
     * @return T
     */
    private function withLock(int $auctionId, callable $callback): mixed
    {
        $lock = Cache::lock('auction:'.$auctionId, 10);

        return $lock->block(5, function () use ($callback) {
            return DB::transaction($callback);
        });
    }

    private function assertCanBid(Auction $auction, User $user): void
    {
        if (! $auction->isLive()) {
            throw ValidationException::withMessages([
                'auction' => ['Auction is not live.'],
            ]);
        }

        if ($auction->ends_at && $auction->ends_at->isPast()) {
            throw ValidationException::withMessages([
                'auction' => ['Auction has ended.'],
            ]);
        }

        if (! $user->is_active || ! $user->isCustomer()) {
            throw ValidationException::withMessages([
                'auction' => ['Only active customers can bid.'],
            ]);
        }

        $approved = AuctionApplication::query()
            ->where('auction_id', $auction->id)
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->exists();

        if (! $approved) {
            throw ValidationException::withMessages([
                'auction' => ['You are not approved to bid on this auction.'],
            ]);
        }
    }

    private function insertBid(Auction $auction, User $user, int $amountCents, bool $isProxy): Bid
    {
        return Bid::query()->create([
            'auction_id' => $auction->id,
            'user_id' => $user->id,
            'amount_cents' => $amountCents,
            'is_proxy' => $isProxy,
        ]);
    }

    private function touchAuctionAfterBid(Auction $auction, Bid $bid): void
    {
        $extended = false;
        $endsAt = $auction->ends_at;

        if (
            $endsAt
            && $auction->anti_snipe_window_sec > 0
            && $endsAt->getTimestamp() - now()->getTimestamp() <= $auction->anti_snipe_window_sec
        ) {
            $endsAt = now()->addSeconds($auction->anti_snipe_extend_sec);
            $extended = true;
        }

        $auction->forceFill([
            'current_price_cents' => $bid->amount_cents,
            'ends_at' => $endsAt,
            'version' => $auction->version + 1,
        ])->save();

        event(new BidPlaced($auction->fresh(), $bid->fresh()));

        if ($extended) {
            event(new AuctionExtended($auction->fresh()));
        }
    }

    private function resolveProxies(Auction $auction, int $excludeUserId): void
    {
        $auction->refresh();
        $leading = $auction->bids()->latest('id')->first();
        if (! $leading) {
            return;
        }

        $proxies = AuctionProxy::query()
            ->where('auction_id', $auction->id)
            ->where('is_active', true)
            ->where('user_id', '!=', $leading->user_id)
            ->where('max_amount_cents', '>=', $leading->amount_cents + $auction->increment_cents)
            ->orderByDesc('max_amount_cents')
            ->orderBy('id')
            ->get();

        foreach ($proxies as $proxy) {
            $auction->refresh();
            $currentLeading = $auction->bids()->latest('id')->first();
            if (! $currentLeading || $currentLeading->user_id === $proxy->user_id) {
                continue;
            }

            $next = $currentLeading->amount_cents + $auction->increment_cents;
            if ($next > $proxy->max_amount_cents) {
                continue;
            }

            $user = User::query()->find($proxy->user_id);
            if (! $user) {
                continue;
            }

            $bid = $this->insertBid($auction, $user, $next, true);
            $this->touchAuctionAfterBid($auction, $bid);
        }
    }

    private function buyNowLocked(Auction $auction, User $user): Bid
    {
        $amount = (int) $auction->buy_now_cents;
        $bid = $this->insertBid($auction, $user, $amount, false);
        $auction->forceFill([
            'current_price_cents' => $amount,
            'version' => $auction->version + 1,
        ])->save();

        event(new BidPlaced($auction->fresh(), $bid->fresh()));
        $this->endAuction($auction->fresh(), 'buy_now', $user->id);

        return $bid->fresh()->load('user');
    }

    private function endAuction(Auction $auction, string $reason, ?int $winnerId = null): void
    {
        $leading = $auction->bids()->latest('id')->first();
        $candidateId = $winnerId ?? $leading?->user_id;
        $meetsReserve = $auction->reserve_price_cents === null
            || ($leading && $leading->amount_cents >= $auction->reserve_price_cents);

        if ($reason !== 'buy_now' && (! $meetsReserve || ! $candidateId)) {
            $candidateId = null;
            $reason = $meetsReserve ? $reason : 'reserve_not_met';
        }

        $auction->forceFill([
            'status' => 'ended',
            'winner_user_id' => $candidateId,
            'ended_reason' => $reason,
            'ends_at' => now(),
            'version' => $auction->version + 1,
        ])->save();

        if ($auction->quantity > 0 && $auction->product && ! $candidateId) {
            $this->inventory->releaseAuctionReservation($auction->product, (int) $auction->quantity);
        }

        event(new AuctionEnded($auction->fresh()->load(['product.brand', 'product.category', 'winner'])));
    }
}
