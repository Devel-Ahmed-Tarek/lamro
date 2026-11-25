<?php

namespace App\Services;

use App\Models\FeatureSetting;
use App\Models\Order;
use App\Models\Payment;
use App\Models\StripeSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
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

    public function settings(): StripeSetting
    {
        return StripeSetting::current();
    }

    public function enabled(): bool
    {
        // StripeSetting.enabled is source of truth; FeatureSetting stays mirrored for the Features page.
        return (bool) $this->settings()->enabled;
    }

    public function demoMode(): bool
    {
        return $this->settings()->isDemoMode();
    }

    public function secretKey(): ?string
    {
        return $this->settings()->secretKey();
    }

    public function publishableKey(): ?string
    {
        return $this->settings()->publishableKey();
    }

    public function webhookSecret(): ?string
    {
        return $this->settings()->webhookSecret();
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

        $settings = $this->settings();

        if ($this->demoMode()) {
            $token = Str::random(40);
            $frontend = $this->frontendBase();
            $url = $frontend.'/checkout/stripe?payment='.$payment->id.'&demo=1&token='.$token;
            $payment->update([
                'provider_id' => 'demo_'.$payment->id,
                'demo_token' => $token,
                'checkout_url' => $url,
                'note' => 'Stripe demo mode (no live keys)',
            ]);

            return $payment->fresh();
        }

        $secret = $settings->secretKey();
        if (! $secret) {
            throw ValidationException::withMessages(['payment' => ['Stripe secret key is not configured.']]);
        }

        Stripe::setApiKey($secret);
        $frontend = $this->frontendBase();

        $payload = [
            'mode' => 'payment',
            'customer_email' => $user->email,
            'client_reference_id' => (string) $order->id,
            'success_url' => $frontend.'/checkout/stripe?session_id={CHECKOUT_SESSION_ID}&success=1',
            'cancel_url' => $frontend.'/checkout/stripe?cancelled=1&order='.$order->id,
            'payment_method_types' => $settings->checkoutPaymentMethodTypes(),
            'billing_address_collection' => $settings->billing_address_collection ?: 'auto',
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
        ];

        if ($settings->phone_number_collection) {
            $payload['phone_number_collection'] = ['enabled' => true];
        }
        if ($settings->allow_promotion_codes) {
            $payload['allow_promotion_codes'] = true;
        }
        if ($settings->tax_id_collection) {
            $payload['tax_id_collection'] = ['enabled' => true];
        }
        if ($settings->statement_descriptor) {
            $payload['payment_intent_data'] = [
                'statement_descriptor' => substr(preg_replace('/[^a-zA-Z0-9 ]/', '', $settings->statement_descriptor) ?? 'JALA', 0, 22),
                'capture_method' => $settings->capture_method === 'manual' ? 'manual' : 'automatic',
            ];
        } elseif ($settings->capture_method === 'manual') {
            $payload['payment_intent_data'] = ['capture_method' => 'manual'];
        }

        $session = Session::create($payload);

        $payment->update([
            'provider_id' => $session->id,
            'checkout_url' => $session->url,
            'note' => 'Stripe Checkout Session',
        ]);

        return $payment->fresh();
    }

    public function completeDemo(Payment $payment, string $token, User $user): Order
    {
        if (! $this->demoMode()) {
            throw ValidationException::withMessages(['token' => ['Stripe demo checkout is disabled.']]);
        }
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
        $secret = (string) ($this->webhookSecret() ?? '');
        if ($secret !== '') {
            $event = Webhook::constructEvent($payload, (string) $signature, $secret);
        } elseif (app()->isProduction()) {
            throw ValidationException::withMessages([
                'stripe' => ['Webhook signature is required in production.'],
            ]);
        } else {
            $event = json_decode($payload, false, 512, JSON_THROW_ON_ERROR);
        }

        $eventId = is_array($event) ? ($event['id'] ?? null) : ($event->id ?? null);
        $type = is_array($event) ? ($event['type'] ?? null) : ($event->type ?? null);
        $object = is_array($event)
            ? ($event['data']['object'] ?? null)
            : ($event->data->object ?? null);

        if ($eventId) {
            $exists = DB::table('stripe_webhook_events')->where('event_id', $eventId)->exists();
            if ($exists) {
                return ['received' => true, 'duplicate' => true];
            }
            DB::table('stripe_webhook_events')->insert([
                'event_id' => $eventId,
                'type' => $type,
                'processed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if ($type === 'checkout.session.completed' && $object) {
            $sessionId = is_array($object) ? ($object['id'] ?? null) : ($object->id ?? null);
            $paymentStatus = is_array($object) ? ($object['payment_status'] ?? null) : ($object->payment_status ?? null);
            $metadata = is_array($object) ? ($object['metadata'] ?? []) : ((array) ($object->metadata ?? []));
            $paymentId = (int) ($metadata['payment_id'] ?? 0);

            if ($paymentStatus === 'paid' || $paymentStatus === 'no_payment_required') {
                $payment = Payment::query()
                    ->where(function ($query) use ($sessionId, $paymentId) {
                        if ($sessionId) {
                            $query->where('provider_id', $sessionId);
                        }
                        if ($paymentId > 0) {
                            $query->orWhere('id', $paymentId);
                        }
                    })
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

        Log::info('stripe.webhook', ['type' => $type, 'event_id' => $eventId]);

        return ['received' => true];
    }

    public function syncSession(string $sessionId): ?Order
    {
        if ($this->demoMode() || ! $this->secretKey()) {
            return null;
        }

        Stripe::setApiKey((string) $this->secretKey());
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

    private function frontendBase(): string
    {
        $frontend = rtrim((string) config('services.stripe.frontend_url', config('app.frontend_url', 'http://127.0.0.1:3000')), '/');

        return explode(',', $frontend)[0];
    }
}
