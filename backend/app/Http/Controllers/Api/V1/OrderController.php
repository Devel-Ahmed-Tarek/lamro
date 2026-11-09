<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Auction;
use App\Models\Order;
use App\Services\CheckoutService;
use App\Services\StripePaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function __construct(
        private CheckoutService $checkout,
        private StripePaymentService $stripe,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->where('user_id', $request->user()->id)
            ->with(['items', 'payment', 'invoice'])
            ->latest()
            ->paginate(min(50, max(1, (int) $request->query('per_page', 20))));

        return response()->json([
            'data' => OrderResource::collection($orders->items()),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);

        return response()->json([
            'data' => new OrderResource($order->load(['items', 'payment', 'invoice', 'user'])),
        ]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $shipping = $request->validate([
            'shipping_name' => ['nullable', 'string', 'max:255'],
            'shipping_line1' => ['nullable', 'string', 'max:255'],
            'shipping_city' => ['nullable', 'string', 'max:255'],
            'shipping_postcode' => ['nullable', 'string', 'max:32'],
            'shipping_country' => ['nullable', 'string', 'size:2'],
            'shipping_method_id' => ['nullable', 'integer', 'exists:shipping_methods,id'],
            'payment_method' => ['nullable', 'in:bank_transfer,stripe'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $order = $this->checkout->checkoutCart($request->user(), $shipping);

        $checkoutUrl = null;
        if (($shipping['payment_method'] ?? '') === 'stripe') {
            $payment = $this->stripe->createCheckoutPayment($order, $request->user());
            $checkoutUrl = $payment->checkout_url;
            $order = $order->fresh()->load(['items', 'payment', 'invoice']);
        }

        return response()->json([
            'data' => new OrderResource($order),
            'checkout_url' => $checkoutUrl,
        ], 201);
    }

    public function checkoutAuction(Request $request, Auction $auction): JsonResponse
    {
        $shipping = $request->validate([
            'shipping_name' => ['nullable', 'string', 'max:255'],
            'shipping_line1' => ['nullable', 'string', 'max:255'],
            'shipping_city' => ['nullable', 'string', 'max:255'],
            'shipping_postcode' => ['nullable', 'string', 'max:32'],
            'shipping_country' => ['nullable', 'string', 'size:2'],
            'shipping_method_id' => ['nullable', 'integer', 'exists:shipping_methods,id'],
            'payment_method' => ['nullable', 'in:bank_transfer,stripe'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $order = $this->checkout->checkoutAuctionWin($request->user(), $auction, $shipping);

        $checkoutUrl = null;
        if (($shipping['payment_method'] ?? '') === 'stripe') {
            $payment = $this->stripe->createCheckoutPayment($order, $request->user());
            $checkoutUrl = $payment->checkout_url;
            $order = $order->fresh()->load(['items', 'payment', 'invoice']);
        }

        return response()->json([
            'data' => new OrderResource($order),
            'checkout_url' => $checkoutUrl,
        ], 201);
    }

    public function wonAuctions(Request $request): JsonResponse
    {
        $auctions = Auction::query()
            ->where('winner_user_id', $request->user()->id)
            ->where('status', 'ended')
            ->with(['product.brand', 'product.category', 'winnerOrder'])
            ->latest('ends_at')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $auctions->map(fn (Auction $auction) => [
                'id' => $auction->id,
                'slug' => $auction->slug,
                'status' => $auction->status,
                'ended_reason' => $auction->ended_reason,
                'current_price' => $auction->current_price,
                'quantity' => $auction->quantity,
                'winner_order_id' => $auction->winner_order_id,
                'payment_pending' => $auction->winner_order_id === null,
                'ends_at' => $auction->ends_at?->toIso8601String(),
                'product' => $auction->product ? [
                    'id' => $auction->product->id,
                    'slug' => $auction->product->slug,
                    'name' => $auction->product->name,
                    'part_number' => $auction->product->part_number,
                ] : null,
            ]),
        ]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $query = Order::query()->with(['items', 'payment', 'invoice', 'user'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($source = $request->query('source')) {
            $query->where('source', $source);
        }

        $orders = $query->paginate(min(100, max(1, (int) $request->query('per_page', 30))));

        return response()->json([
            'data' => OrderResource::collection($orders->items()),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function adminShow(Order $order): JsonResponse
    {
        return response()->json([
            'data' => new OrderResource($order->load(['items', 'payment', 'invoice', 'user'])),
        ]);
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrder($request, $order);
        $order = $this->checkout->cancelOrder($order, $request->user());

        return response()->json(['data' => new OrderResource($order)]);
    }

    public function adminUpdateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending_payment,paid,processing,shipped,delivered,cancelled,return_requested,returned,refunded'],
        ]);

        if ($order->status === 'cancelled' && $data['status'] !== 'cancelled') {
            throw ValidationException::withMessages(['status' => ['Cancelled orders cannot be reopened here.']]);
        }

        $order->update(['status' => $data['status']]);

        return response()->json([
            'data' => new OrderResource($order->fresh()->load(['items', 'payment', 'invoice', 'user'])),
        ]);
    }

    private function authorizeOrder(Request $request, Order $order): void
    {
        if ($order->user_id !== $request->user()->id && ! $request->user()->can('admin.orders')) {
            abort(403);
        }
    }
}
