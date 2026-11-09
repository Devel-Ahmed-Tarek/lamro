<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Auction extends Model
{
    protected $fillable = [
        'product_id',
        'slug',
        'type',
        'status',
        'starts_at',
        'ends_at',
        'starting_price_cents',
        'current_price_cents',
        'increment_cents',
        'reserve_price_cents',
        'buy_now_cents',
        'anti_snipe_window_sec',
        'anti_snipe_extend_sec',
        'quantity',
        'version',
        'winner_user_id',
        'winner_order_id',
        'ended_reason',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    protected $appends = [
        'starting_price',
        'current_price',
        'increment',
        'buy_now',
        'has_reserve',
        'ends_in_seconds',
    ];

    public function getStartingPriceAttribute(): float
    {
        return round($this->starting_price_cents / 100, 2);
    }

    public function getCurrentPriceAttribute(): float
    {
        return round($this->current_price_cents / 100, 2);
    }

    public function getIncrementAttribute(): float
    {
        return round($this->increment_cents / 100, 2);
    }

    public function getBuyNowAttribute(): ?float
    {
        return $this->buy_now_cents === null ? null : round($this->buy_now_cents / 100, 2);
    }

    public function getHasReserveAttribute(): bool
    {
        return $this->reserve_price_cents !== null;
    }

    public function getEndsInSecondsAttribute(): ?int
    {
        if (! $this->ends_at) {
            return null;
        }

        return max(0, $this->ends_at->getTimestamp() - now()->getTimestamp());
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function winnerOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'winner_order_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(AuctionApplication::class);
    }

    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class)->orderByDesc('id');
    }

    public function proxies(): HasMany
    {
        return $this->hasMany(AuctionProxy::class);
    }

    public function leadingBid(): HasOne
    {
        return $this->hasOne(Bid::class)->latestOfMany();
    }

    public function scopePublicList(Builder $query): Builder
    {
        return $query->whereIn('status', ['scheduled', 'live', 'ended']);
    }

    public function isLive(): bool
    {
        return $this->status === 'live';
    }

    public function isOpenForApplications(): bool
    {
        return in_array($this->status, ['scheduled', 'live'], true);
    }
}
