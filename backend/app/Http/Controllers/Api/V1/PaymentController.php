<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Services\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private CheckoutService $checkout) {}

    public function adminIndex(Request $request): JsonResponse
    {
        $query = Payment::query()->with(['order.user', 'reviewer'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $payments = $query->paginate(min(100, max(1, (int) $request->query('per_page', 30))));

        return response()->json([
            'data' => PaymentResource::collection($payments->items()),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    public function markReceived(Request $request, Payment $payment): JsonResponse
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $order = $this->checkout->markPaymentReceived($payment, $request->user(), $data['note'] ?? null);

        return response()->json(['data' => new OrderResource($order)]);
    }

    public function markFailed(Request $request, Payment $payment): JsonResponse
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $order = $this->checkout->markPaymentFailed($payment, $request->user(), $data['note'] ?? null);

        return response()->json(['data' => new OrderResource($order)]);
    }
}
