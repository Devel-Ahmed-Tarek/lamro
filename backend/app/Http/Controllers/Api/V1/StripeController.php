<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentResource;
use App\Models\FeatureSetting;
use App\Models\Order;
use App\Models\Payment;
use App\Services\StripePaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StripeController extends Controller
{
    public function __construct(private StripePaymentService $stripe) {}

    public function config(): JsonResponse
    {
        return response()->json([
            'data' => [
                'enabled' => $this->stripe->enabled() && FeatureSetting::enabled('payment_stripe', false),
                'demo' => $this->stripe->demoMode(),
                'publishable_key' => config('services.stripe.key'),
            ],
        ]);
    }

    public function start(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id || $request->user()->can('admin.payments'), 403);

        if ($order->status !== 'pending_payment') {
            return response()->json(['message' => 'Order is not awaiting payment.'], 422);
        }

        $payment = $this->stripe->createCheckoutPayment($order, $request->user());

        return response()->json([
            'data' => [
                'payment' => new PaymentResource($payment),
                'order' => new OrderResource($order->fresh()->load(['items', 'payment', 'invoice'])),
                'checkout_url' => $payment->checkout_url,
                'demo' => $this->stripe->demoMode(),
            ],
        ]);
    }

    public function demoComplete(Request $request, Payment $payment): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $order = $this->stripe->completeDemo($payment, $data['token'], $request->user());

        return response()->json([
            'data' => new OrderResource($order->load(['items', 'payment', 'invoice'])),
        ]);
    }

    public function syncSession(Request $request): JsonResponse
    {
        $data = $request->validate([
            'session_id' => ['required', 'string'],
        ]);

        $order = $this->stripe->syncSession($data['session_id']);
        if (! $order) {
            return response()->json(['message' => 'Session not paid yet.'], 422);
        }

        abort_unless($order->user_id === $request->user()->id || $request->user()->can('admin.payments'), 403);

        return response()->json([
            'data' => new OrderResource($order->load(['items', 'payment', 'invoice'])),
        ]);
    }

    public function webhook(Request $request): JsonResponse
    {
        $this->stripe->handleWebhook($request->getContent(), $request->header('Stripe-Signature'));

        return response()->json(['received' => true]);
    }
}
