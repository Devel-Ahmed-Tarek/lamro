<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FeatureSetting;
use App\Models\StripeSetting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Stripe\Stripe;
use Stripe\StripeClient;

class StripeSettingsController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->payload(StripeSetting::current())]);
    }

    public function update(Request $request): JsonResponse
    {
        $catalogIds = collect(StripeSetting::catalogPaymentMethodTypes())->pluck('id')->all();

        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'demo_mode' => ['sometimes', 'boolean'],
            'publishable_key' => ['nullable', 'string', 'max:255'],
            'secret_key' => ['nullable', 'string', 'max:255'],
            'webhook_secret' => ['nullable', 'string', 'max:255'],
            'clear_secret_key' => ['sometimes', 'boolean'],
            'clear_webhook_secret' => ['sometimes', 'boolean'],
            'payment_method_types' => ['sometimes', 'array', 'min:1'],
            'payment_method_types.*' => ['string', Rule::in($catalogIds)],
            'statement_descriptor' => ['nullable', 'string', 'max:22'],
            'capture_method' => ['sometimes', Rule::in(['automatic', 'manual'])],
            'billing_address_collection' => ['sometimes', Rule::in(['auto', 'required'])],
            'phone_number_collection' => ['sometimes', 'boolean'],
            'allow_promotion_codes' => ['sometimes', 'boolean'],
            'tax_id_collection' => ['sometimes', 'boolean'],
            'bank_transfer_enabled' => ['sometimes', 'boolean'],
            'paypal_feature_enabled' => ['sometimes', 'boolean'],
        ]);

        $settings = StripeSetting::current();

        if (array_key_exists('publishable_key', $data)) {
            $settings->publishable_key = $this->normalizeKey($data['publishable_key']);
        }
        if (! empty($data['clear_secret_key'])) {
            $settings->secret_key = null;
        } elseif (! empty($data['secret_key'])) {
            $settings->secret_key = trim((string) $data['secret_key']);
        }
        if (! empty($data['clear_webhook_secret'])) {
            $settings->webhook_secret = null;
        } elseif (! empty($data['webhook_secret'])) {
            $settings->webhook_secret = trim((string) $data['webhook_secret']);
        }

        foreach ([
            'enabled',
            'demo_mode',
            'payment_method_types',
            'statement_descriptor',
            'capture_method',
            'billing_address_collection',
            'phone_number_collection',
            'allow_promotion_codes',
            'tax_id_collection',
        ] as $field) {
            if (array_key_exists($field, $data)) {
                $settings->{$field} = $data[$field];
            }
        }

        $settings->save();
        StripeSetting::flushCache();

        if (array_key_exists('enabled', $data)) {
            $this->syncFeature('payment_stripe', (bool) $data['enabled']);
        }
        if (array_key_exists('bank_transfer_enabled', $data)) {
            $this->syncFeature('payment_bank_transfer', (bool) $data['bank_transfer_enabled']);
        }
        if (array_key_exists('paypal_feature_enabled', $data)) {
            $this->syncFeature('payment_paypal', (bool) $data['paypal_feature_enabled']);
        }

        $this->audit->log($request->user(), 'stripe.settings_updated', $settings);

        return response()->json(['data' => $this->payload($settings->fresh() ?? StripeSetting::current())]);
    }

    public function test(Request $request): JsonResponse
    {
        $settings = StripeSetting::current();
        $secret = $settings->secretKey();
        if (! $secret) {
            return response()->json([
                'data' => [
                    'ok' => false,
                    'message' => 'Secret key is missing. Paste sk_test_… or sk_live_… first.',
                ],
            ], 422);
        }

        try {
            Stripe::setApiKey($secret);
            $client = new StripeClient($secret);
            $account = $client->accounts->retrieve();

            $this->audit->log($request->user(), 'stripe.connection_tested', $settings, [
                'account_id' => $account->id ?? null,
            ]);

            return response()->json([
                'data' => [
                    'ok' => true,
                    'message' => 'Stripe connection OK.',
                    'account_id' => $account->id ?? null,
                    'livemode' => (bool) ($account->livemode ?? str_starts_with($secret, 'sk_live_')),
                    'country' => $account->country ?? null,
                    'business_name' => $account->settings->dashboard->display_name
                        ?? $account->business_profile->name
                        ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'data' => [
                    'ok' => false,
                    'message' => $e->getMessage(),
                ],
            ], 422);
        }
    }

    private function syncFeature(string $key, bool $enabled): void
    {
        $feature = FeatureSetting::query()->firstOrCreate(['key' => $key], ['enabled' => $enabled]);
        $feature->update(['enabled' => $enabled]);
        FeatureSetting::flushCache();
    }

    private function normalizeKey(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /** @return array<string, mixed> */
    private function payload(StripeSetting $settings): array
    {
        $secret = $settings->secretKey();
        $webhook = $settings->webhookSecret();

        return [
            'enabled' => (bool) $settings->enabled,
            'demo_mode' => (bool) $settings->demo_mode,
            'publishable_key' => $settings->publishableKey(),
            'secret_key_set' => (bool) $secret,
            'secret_key_hint' => StripeSetting::mask($secret),
            'webhook_secret_set' => (bool) $webhook,
            'webhook_secret_hint' => StripeSetting::mask($webhook),
            'webhook_url' => StripeSetting::webhookUrl(),
            'payment_method_types' => $settings->checkoutPaymentMethodTypes(),
            'available_payment_method_types' => StripeSetting::catalogPaymentMethodTypes(),
            'statement_descriptor' => $settings->statement_descriptor,
            'capture_method' => $settings->capture_method ?: 'automatic',
            'billing_address_collection' => $settings->billing_address_collection ?: 'auto',
            'phone_number_collection' => (bool) $settings->phone_number_collection,
            'allow_promotion_codes' => (bool) $settings->allow_promotion_codes,
            'tax_id_collection' => (bool) $settings->tax_id_collection,
            'bank_transfer_enabled' => FeatureSetting::enabled('payment_bank_transfer', true),
            'paypal_feature_enabled' => FeatureSetting::enabled('payment_paypal', false),
            'setup' => [
                'dashboard_keys_url' => 'https://dashboard.stripe.com/apikeys',
                'dashboard_webhooks_url' => 'https://dashboard.stripe.com/webhooks',
                'dashboard_payment_methods_url' => 'https://dashboard.stripe.com/settings/payment_methods',
                'events' => ['checkout.session.completed'],
                'steps' => [
                    [
                        'title' => 'Open Stripe API keys',
                        'detail' => 'Stripe Dashboard → Developers → API keys. Copy Publishable key (pk_…) and Secret key (sk_…).',
                        'url' => 'https://dashboard.stripe.com/apikeys',
                    ],
                    [
                        'title' => 'Paste keys here',
                        'detail' => 'Put pk_… in Publishable key and sk_… in Secret key on this page, then Save.',
                    ],
                    [
                        'title' => 'Create a webhook endpoint',
                        'detail' => 'Stripe Dashboard → Developers → Webhooks → Add endpoint. Paste the Webhook URL from this page. Listen to checkout.session.completed.',
                        'url' => 'https://dashboard.stripe.com/webhooks',
                    ],
                    [
                        'title' => 'Copy the webhook signing secret',
                        'detail' => 'Open the endpoint → Reveal Signing secret (whsec_…) → paste it into Webhook secret here → Save.',
                    ],
                    [
                        'title' => 'Enable payment methods in Stripe',
                        'detail' => 'Stripe Dashboard → Settings → Payment methods. Turn on the same methods you select below (card, SEPA, iDEAL, …).',
                        'url' => 'https://dashboard.stripe.com/settings/payment_methods',
                    ],
                    [
                        'title' => 'Go live',
                        'detail' => 'Use live keys (pk_live_ / sk_live_), turn Demo mode OFF, enable Stripe on this page, then Test connection.',
                    ],
                ],
            ],
        ];
    }
}
