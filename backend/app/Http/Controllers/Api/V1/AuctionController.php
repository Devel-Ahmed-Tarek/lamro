<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuctionApplicationResource;
use App\Http\Resources\AuctionResource;
use App\Http\Resources\BidResource;
use App\Models\Auction;
use App\Models\AuctionApplication;
use App\Models\Bid;
use App\Models\Product;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\NotifyService;
use App\Services\PlaceBidService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuctionController extends Controller
{
    public function __construct(
        private PlaceBidService $bids,
        private InventoryService $inventory,
        private NotifyService $notify,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $admin = str_contains($request->path(), '/admin/');

        $query = Auction::query()
            ->with(['product.brand', 'product.category'])
            ->withCount(['applications', 'bids'])
            ->when(! $admin, fn ($q) => $q->publicList());

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($q = trim((string) $request->query('q', ''))) {
            $like = '%'.mb_strtolower($q).'%';
            $query->whereHas('product', function ($product) use ($like) {
                $product->whereRaw('LOWER(part_number) LIKE ?', [$like])
                    ->orWhereRaw("LOWER(json_extract(name, '$.en')) LIKE ?", [$like])
                    ->orWhereRaw("LOWER(json_extract(name, '$.de')) LIKE ?", [$like]);
            });
        }

        $query->orderByRaw("CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'ended' THEN 2 ELSE 3 END")
            ->orderBy('ends_at');

        $items = $query->paginate(min(100, max(1, (int) $request->query('per_page', 50))));

        return response()->json([
            'data' => AuctionResource::collection($items->items()),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $auction = Auction::query()
            ->where('slug', $slug)
            ->publicList()
            ->with([
                'product.brand',
                'product.category',
                'bids' => fn ($q) => $q->with('user')->limit(50),
            ])
            ->withCount(['applications', 'bids'])
            ->firstOrFail();

        if ($request->user()) {
            $auction->load(['applications' => fn ($q) => $q->where('user_id', $request->user()->id)]);
        }

        return response()->json([
            'data' => new AuctionResource($auction),
        ]);
    }

    public function apply(Request $request, Auction $auction): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->isCustomer()) {
            throw ValidationException::withMessages(['auction' => ['Only customers can apply.']]);
        }

        if (! $auction->isOpenForApplications()) {
            throw ValidationException::withMessages(['auction' => ['Applications are closed for this auction.']]);
        }

        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $application = AuctionApplication::query()->firstOrCreate(
            ['auction_id' => $auction->id, 'user_id' => $user->id],
            ['status' => 'pending', 'note' => $data['note'] ?? null],
        );

        $reopened = false;
        if ($application->wasRecentlyCreated === false && $application->status === 'rejected') {
            $application->update([
                'status' => 'pending',
                'note' => $data['note'] ?? $application->note,
                'reviewed_by' => null,
                'reviewed_at' => null,
            ]);
            $reopened = true;
        }

        if ($application->wasRecentlyCreated || $reopened) {
            $auction->loadMissing('product');
            $label = $auction->product?->part_number
                ?? $auction->product?->sku
                ?? $auction->slug
                ?? '#'.$auction->id;

            $this->notify->notifyAdmins(
                'admin.auction_application',
                'Auction application',
                $user->name.' applied for auction '.$label,
                [
                    'auction_id' => $auction->id,
                    'application_id' => $application->id,
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                ],
                '/admin/auctions',
            );
        }

        return response()->json([
            'data' => new AuctionApplicationResource($application->fresh()->load(['auction.product', 'user'])),
        ], 201);
    }

    public function placeBid(Request $request, Auction $auction): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $bid = $this->bids->place(
            $auction,
            $request->user(),
            (int) round(((float) $data['amount']) * 100),
        );

        return response()->json([
            'data' => [
                'bid' => new BidResource($bid),
                'auction' => new AuctionResource(
                    $auction->fresh()->load(['product.brand', 'product.category', 'bids' => fn ($q) => $q->with('user')->limit(50)])
                        ->load(['applications' => fn ($q) => $q->where('user_id', $request->user()->id)])
                ),
            ],
        ], 201);
    }

    public function setProxy(Request $request, Auction $auction): JsonResponse
    {
        $data = $request->validate([
            'max_amount' => ['required', 'numeric', 'min:0'],
        ]);

        $proxy = $this->bids->setProxy(
            $auction,
            $request->user(),
            (int) round(((float) $data['max_amount']) * 100),
        );

        return response()->json([
            'data' => [
                'max_amount' => round($proxy->max_amount_cents / 100, 2),
                'is_active' => $proxy->is_active,
                'auction' => new AuctionResource(
                    $auction->fresh()->load(['product.brand', 'product.category', 'bids' => fn ($q) => $q->with('user')->limit(50)])
                        ->load(['applications' => fn ($q) => $q->where('user_id', $request->user()->id)])
                ),
            ],
        ]);
    }

    public function cancelProxy(Request $request, Auction $auction): JsonResponse
    {
        $this->bids->cancelProxy($auction, $request->user());

        return response()->json(['data' => ['ok' => true]]);
    }

    public function buyNow(Request $request, Auction $auction): JsonResponse
    {
        $bid = $this->bids->buyNow($auction, $request->user());

        return response()->json([
            'data' => [
                'bid' => new BidResource($bid),
                'auction' => new AuctionResource(
                    $auction->fresh()->load(['product.brand', 'product.category', 'bids' => fn ($q) => $q->with('user')->limit(50)])
                        ->load(['applications' => fn ($q) => $q->where('user_id', $request->user()->id)])
                ),
            ],
        ]);
    }

    public function myApplications(Request $request): JsonResponse
    {
        $items = AuctionApplication::query()
            ->where('user_id', $request->user()->id)
            ->with(['auction.product'])
            ->latest()
            ->get();

        return response()->json([
            'data' => AuctionApplicationResource::collection($items),
        ]);
    }

    public function myBids(Request $request): JsonResponse
    {
        $items = Bid::query()
            ->where('user_id', $request->user()->id)
            ->with(['auction.product', 'user'])
            ->latest()
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $items->map(fn (Bid $bid) => [
                'id' => $bid->id,
                'auction_id' => $bid->auction_id,
                'amount' => $bid->amount,
                'amount_cents' => $bid->amount_cents,
                'is_proxy' => $bid->is_proxy,
                'bidder_label' => $bid->bidder_label,
                'created_at' => $bid->created_at?->toIso8601String(),
                'auction' => $bid->auction ? [
                    'id' => $bid->auction->id,
                    'slug' => $bid->auction->slug,
                    'status' => $bid->auction->status,
                    'product_name' => $bid->auction->product?->name,
                ] : null,
            ]),
        ]);
    }

    public function adminShow(Auction $auction): JsonResponse
    {
        $auction->load([
            'product.brand',
            'product.category',
            'bids' => fn ($q) => $q->with('user')->limit(100),
            'applications.user',
        ])->loadCount(['applications', 'bids']);

        return response()->json([
            'data' => new AuctionResource($auction),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedAuction($request);
        $product = Product::query()->findOrFail($data['product_id']);
        $qty = max(1, (int) ($data['quantity'] ?? 1));

        $auction = DB::transaction(function () use ($data, $product, $qty) {
            $this->inventory->reserveForAuction($product, $qty);
            $data['quantity'] = $qty;

            return Auction::query()->create($data);
        });

        return response()->json([
            'data' => new AuctionResource($auction->load(['product.brand', 'product.category'])->loadCount(['applications', 'bids'])),
        ], 201);
    }

    public function update(Request $request, Auction $auction): JsonResponse
    {
        $data = $this->validatedAuction($request, $auction);
        $auction->update($data);

        return response()->json([
            'data' => new AuctionResource($auction->fresh()->load(['product.brand', 'product.category'])->loadCount(['applications', 'bids'])),
        ]);
    }

    public function goLive(Auction $auction): JsonResponse
    {
        if (! in_array($auction->status, ['draft', 'scheduled'], true)) {
            throw ValidationException::withMessages(['status' => ['Auction cannot go live from this status.']]);
        }

        $auction->update([
            'status' => 'live',
            'starts_at' => $auction->starts_at ?? now(),
        ]);

        return response()->json([
            'data' => new AuctionResource($auction->fresh()->load(['product.brand', 'product.category'])),
        ]);
    }

    public function end(Auction $auction): JsonResponse
    {
        if ($auction->status !== 'live') {
            throw ValidationException::withMessages(['status' => ['Only live auctions can be ended.']]);
        }

        $ended = $this->bids->forceEnd($auction, 'admin_ended');

        return response()->json([
            'data' => new AuctionResource($ended->load(['product.brand', 'product.category', 'winner'])),
        ]);
    }

    public function cancel(Auction $auction): JsonResponse
    {
        if ($auction->status === 'ended') {
            throw ValidationException::withMessages(['status' => ['Ended auctions cannot be cancelled.']]);
        }

        DB::transaction(function () use ($auction) {
            $auction->update([
                'status' => 'cancelled',
                'ended_reason' => 'cancelled',
                'ends_at' => now(),
            ]);
            if ($auction->product && $auction->quantity > 0) {
                $this->inventory->releaseAuctionReservation($auction->product, (int) $auction->quantity);
            }
        });

        return response()->json([
            'data' => new AuctionResource($auction->fresh()->load(['product.brand', 'product.category'])),
        ]);
    }

    public function applications(Request $request): JsonResponse
    {
        $query = AuctionApplication::query()
            ->with(['user', 'auction.product'])
            ->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($auctionId = $request->query('auction_id')) {
            $query->where('auction_id', $auctionId);
        }

        return response()->json([
            'data' => AuctionApplicationResource::collection($query->limit(200)->get()),
        ]);
    }

    public function approveApplication(Request $request, AuctionApplication $application): JsonResponse
    {
        $application->update([
            'status' => 'approved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'data' => new AuctionApplicationResource($application->fresh()->load(['user', 'auction.product'])),
        ]);
    }

    public function rejectApplication(Request $request, AuctionApplication $application): JsonResponse
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $application->update([
            'status' => 'rejected',
            'note' => $data['note'] ?? $application->note,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'data' => new AuctionApplicationResource($application->fresh()->load(['user', 'auction.product'])),
        ]);
    }

    /** @return array<string, mixed> */
    private function validatedAuction(Request $request, ?Auction $existing = null): array
    {
        $data = $request->validate([
            'product_id' => [$existing ? 'sometimes' : 'required', 'exists:products,id'],
            'slug' => ['nullable', 'string', 'max:190', Rule::unique('auctions', 'slug')->ignore($existing?->id)],
            'type' => [$existing ? 'sometimes' : 'required', Rule::in(['live', 'scheduled', 'timed'])],
            'status' => ['nullable', Rule::in(['draft', 'scheduled', 'live', 'ended', 'cancelled'])],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'starting_price' => [$existing ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'increment' => [$existing ? 'sometimes' : 'required', 'numeric', 'min:0.01'],
            'reserve_price' => ['nullable', 'numeric', 'min:0'],
            'buy_now' => ['nullable', 'numeric', 'min:0'],
            'anti_snipe_window_sec' => ['nullable', 'integer', 'min:0'],
            'anti_snipe_extend_sec' => ['nullable', 'integer', 'min:0'],
            'quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        $starting = array_key_exists('starting_price', $data)
            ? (int) round(((float) $data['starting_price']) * 100)
            : $existing?->starting_price_cents;

        $payload = [
            'product_id' => $data['product_id'] ?? $existing?->product_id,
            'type' => $data['type'] ?? $existing?->type,
            'status' => $data['status'] ?? $existing?->status ?? 'scheduled',
            'starts_at' => $data['starts_at'] ?? $existing?->starts_at,
            'ends_at' => $data['ends_at'] ?? $existing?->ends_at,
            'starting_price_cents' => $starting,
            'current_price_cents' => $existing?->current_price_cents ?? $starting,
            'increment_cents' => array_key_exists('increment', $data)
                ? (int) round(((float) $data['increment']) * 100)
                : $existing?->increment_cents,
            'reserve_price_cents' => array_key_exists('reserve_price', $data)
                ? ($data['reserve_price'] === null ? null : (int) round(((float) $data['reserve_price']) * 100))
                : $existing?->reserve_price_cents,
            'buy_now_cents' => array_key_exists('buy_now', $data)
                ? ($data['buy_now'] === null ? null : (int) round(((float) $data['buy_now']) * 100))
                : $existing?->buy_now_cents,
            'anti_snipe_window_sec' => $data['anti_snipe_window_sec'] ?? $existing?->anti_snipe_window_sec ?? 120,
            'anti_snipe_extend_sec' => $data['anti_snipe_extend_sec'] ?? $existing?->anti_snipe_extend_sec ?? 120,
            'quantity' => $data['quantity'] ?? $existing?->quantity ?? 1,
        ];

        if (! empty($data['slug'])) {
            $payload['slug'] = $data['slug'];
        } elseif (! $existing) {
            $product = Product::query()->findOrFail($payload['product_id']);
            $base = Str::slug(($product->slug ?: 'auction').'-'.Str::random(4));
            $payload['slug'] = $base;
        }

        return $payload;
    }
}
