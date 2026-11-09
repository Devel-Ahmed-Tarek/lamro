<?php

namespace App\Services;

use App\Models\FeatureSetting;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Stripe\Checkout\Session;
use Stripe\Stripe;
use Stripe\Webhook;

class StripePaymentService
{
    public function __construct(
        private CheckoutService $checkout,
        private AuditLogger $audit,
    ) {}

    public function enabled(): bool
    {
        return FeatureSetting::enabled('payment_stripe', false);
    }

    public function demoMode(): bool
    {
        if (! config('services.stripe.secret')) {
            return true;
        }

        return (bool) config('services.stripe.demo');
    }

    public function createCheckoutPayment(Order $order, User $user): Payment
    {
        if (! $this->enabled()) {
            throw ValidationException::withMessages(['payment' => ['Stripe is disabled.']]);
        }

        $payment = $order->payment;
        if (! $payment) {
            $payment = Payment::query()->create([
                'order_id' => $order->id,
                'method' => 'stripe',
                'status' => 'pending',
                'amount_cents' => $order->total_cents,
                'currency' => $order->currency,
                'reference' => $order->number,
            ]);
        } else {
            $payment->update([
                'method' => 'stripe',
                'status' => 'pending',
                'amount_cents' => $order->total_cents,
            ]);
        }

        if ($this->demoMode()) {
            $token = Str::random(40);
            $frontend = rtrim((string) config('services.stripe.frontend_url', config('app.frontend_url', 'http://127.0.0.1:3000')), '/');
            // FRONTEND_URL may be comma-separated
            $frontend = explode(',', $frontend)[0];
            $url = $frontend.'/checkout/stripe?payment='.$payment->id.'&demo=1&token='.$token;
            $payment->update([
                'provider_id' => 'demo_'.$payment->id,
                'demo_token' => $token,
                'checkout_url' => $url,
                'note' => 'Stripe demo mode (no live keys)',
            ]);

            return $payment->fresh();
        }

        Stripe::setApiKey((string) config('services.stripe.secret'));
        $frontend = rtrim(explode(',', (string) config('services.stripe.frontend_url', 'http://127.0.0.1:3000'))[0], '/');

        $session = Session::create([
            'mode' => 'payment',
            'customer_email' => $user->email,
            'client_reference_id' => (string) $order->id,
            'success_url' => $frontend.'/checkout/stripe?session_id={CHECKOUT_SESSION_ID}&success=1',
            'cancel_url' => $frontend.'/checkout/stripe?cancelled=1&order='.$order->id,
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => strtolower($order->currency ?: 'eur'),
                    'unit_amount' => (int) $order->total_cents,
                    'product_data' => [
                        'name' => 'Jala order '.$order->number,
                    ],
                ],
            ]],
            'metadata' => [
                'order_id' => (string) $order->id,
                'order_number' => $order->number,
                'payment_id' => (string) $payment->id,
            ],
        ]);

        $payment->update([
            'provider_id' => $session->id,
            'checkout_url' => $session->url,
            'note' => 'Stripe Checkout Session',
        ]);

        return $payment->fresh();
    }

    public function completeDemo(Payment $payment, string $token, User $user): Order
    {
        if ($payment->method !== 'stripe' || ! $payment->demo_token || ! hash_equals($payment->demo_token, $token)) {
            throw ValidationException::withMessages(['token' => ['Invalid demo payment token.']]);
        }
        if ($payment->order?->user_id !== $user->id && ! $user->can('admin.payments')) {
            abort(403);
        }

        $order = $this->checkout->markPaymentReceived($payment, $user, 'Stripe demo payment');
        $this->audit->log($user, 'payment.stripe_demo', $payment);

        return $order;
    }

    public function handleWebhook(string $payload, ?string $signature): array
    {
        $secret = (string) config('services.stripe.webhook_secret');
        if ($secret) {
            $event = Webhook::constructEvent($payload, (string) $signature, $secret);
        } else {
            $event = json_decode($payload, false, 512, JSON_THROW_ON_ERROR);
        }

        $type = is_array($event) ? ($event['type'] ?? null) : ($event->type ?? null);
        $object = is_array($event)
            ? ($event['data']['object'] ?? null)
            : ($event->data->object ?? null);

        if ($type === 'checkout.session.completed' && $object) {
            $sessionId = is_array($object) ? ($object['id'] ?? null) : ($object->id ?? null);
            $paymentStatus = is_array($object) ? ($object['payment_status'] ?? null) : ($object->payment_status ?? null);
            $metadata = is_array($object) ? ($object['metadata'] ?? []) : ((array) ($object->metadata ?? []));

            if ($paymentStatus === 'paid' || $paymentStatus === 'no_payment_required') {
                $payment = Payment::query()
                    ->where('provider_id', $sessionId)
                    ->orWhere('id', $metadata['payment_id'] ?? 0)
                    ->first();

                if ($payment && $payment->status !== 'received') {
                    $admin = User::query()->role('super_admin')->first() ?? $payment->order?->user;
                    if ($admin) {
                        $this->checkout->markPaymentReceived($payment, $admin, 'Stripe webhook');
                        $this->audit->log($admin, 'payment.stripe_webhook', $payment);
                    }
                }
            }
        }

        Log::info('stripe.webhook', ['type' => $type]);

        return ['received' => true];
    }

    public function syncSession(string $sessionId): ?Order
    {
        if ($this->demoMode() || ! config('services.stripe.secret')) {
            return null;
        }

        Stripe::setApiKey((string) config('services.stripe.secret'));
        $session = Session::retrieve($sessionId);
        if ($session->payment_status !== 'paid') {
            return null;
        }

        $payment = Payment::query()->where('provider_id', $session->id)->first();
        if (! $payment || $payment->status === 'received') {
            return $payment?->order?->load(['items', 'payment', 'invoice']);
        }

        $admin = User::query()->role('super_admin')->first() ?? $payment->order?->user;
        if (! $admin) {
            return null;
        }

        return $this->checkout->markPaymentReceived($payment, $admin, 'Stripe session sync');
    }
}
