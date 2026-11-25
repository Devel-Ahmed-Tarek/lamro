<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class StripeSetting extends Model
{
    protected $fillable = [
        'enabled',
        'demo_mode',
        'publishable_key',
        'secret_key',
        'webhook_secret',
        'payment_method_types',
        'statement_descriptor',
        'capture_method',
        'billing_address_collection',
        'phone_number_collection',
        'allow_promotion_codes',
        'tax_id_collection',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'demo_mode' => 'boolean',
            'secret_key' => 'encrypted',
            'webhook_secret' => 'encrypted',
            'payment_method_types' => 'array',
            'phone_number_collection' => 'boolean',
            'allow_promotion_codes' => 'boolean',
            'tax_id_collection' => 'boolean',
        ];
    }

    /** @return list<string> */
    public static function defaultPaymentMethodTypes(): array
    {
        return ['card'];
    }

    /** @return list<array{id:string,label:string,hint:string}> */
    public static function catalogPaymentMethodTypes(): array
    {
        return [
            ['id' => 'card', 'label' => 'Card', 'hint' => 'Visa, Mastercard, Amex, …'],
            ['id' => 'sepa_debit', 'label' => 'SEPA Direct Debit', 'hint' => 'EU bank debit'],
            ['id' => 'ideal', 'label' => 'iDEAL', 'hint' => 'Netherlands'],
            ['id' => 'bancontact', 'label' => 'Bancontact', 'hint' => 'Belgium'],
            ['id' => 'eps', 'label' => 'EPS', 'hint' => 'Austria'],
            ['id' => 'giropay', 'label' => 'Giropay', 'hint' => 'Germany (legacy)'],
            ['id' => 'p24', 'label' => 'Przelewy24', 'hint' => 'Poland'],
            ['id' => 'klarna', 'label' => 'Klarna', 'hint' => 'Pay later / installments'],
            ['id' => 'paypal', 'label' => 'PayPal', 'hint' => 'Requires PayPal in Stripe'],
            ['id' => 'link', 'label' => 'Link', 'hint' => 'Stripe Link one-click'],
            ['id' => 'apple_pay', 'label' => 'Apple Pay', 'hint' => 'Via card + Stripe Dashboard'],
            ['id' => 'google_pay', 'label' => 'Google Pay', 'hint' => 'Via card + Stripe Dashboard'],
        ];
    }

    public static function current(): self
    {
        $row = static::query()->first();
        if ($row) {
            return $row;
        }

        return static::query()->create([
            'enabled' => FeatureSetting::enabled('payment_stripe', false),
            'demo_mode' => (bool) config('services.stripe.demo', true),
            'publishable_key' => config('services.stripe.key') ?: null,
            'secret_key' => config('services.stripe.secret') ?: null,
            'webhook_secret' => config('services.stripe.webhook_secret') ?: null,
            'payment_method_types' => static::defaultPaymentMethodTypes(),
            'capture_method' => 'automatic',
            'billing_address_collection' => 'auto',
        ]);
    }

    public static function flushCache(): void
    {
        Cache::forget('stripe_settings_current');
    }

    public function publishableKey(): ?string
    {
        $key = trim((string) ($this->publishable_key ?: config('services.stripe.key')));

        return $key !== '' ? $key : null;
    }

    public function secretKey(): ?string
    {
        $key = trim((string) ($this->secret_key ?: config('services.stripe.secret')));

        return $key !== '' ? $key : null;
    }

    public function webhookSecret(): ?string
    {
        $key = trim((string) ($this->webhook_secret ?: config('services.stripe.webhook_secret')));

        return $key !== '' ? $key : null;
    }

    public function isDemoMode(): bool
    {
        if (! $this->secretKey()) {
            return true;
        }

        return (bool) $this->demo_mode;
    }

    /** @return list<string> */
    public function checkoutPaymentMethodTypes(): array
    {
        $allowed = collect(static::catalogPaymentMethodTypes())->pluck('id')->all();
        // Apple/Google Pay are wallet overlays — Checkout uses "card".
        $wallets = ['apple_pay', 'google_pay'];
        $types = collect($this->payment_method_types ?: static::defaultPaymentMethodTypes())
            ->map(fn ($t) => (string) $t)
            ->reject(fn ($t) => in_array($t, $wallets, true))
            ->filter(fn ($t) => in_array($t, $allowed, true))
            ->unique()
            ->values()
            ->all();

        return $types !== [] ? $types : static::defaultPaymentMethodTypes();
    }

    public static function mask(?string $value): ?string
    {
        if (! $value) {
            return null;
        }
        $len = strlen($value);
        if ($len <= 8) {
            return str_repeat('•', $len);
        }

        return substr($value, 0, 7).str_repeat('•', max(4, $len - 11)).substr($value, -4);
    }

    public static function webhookUrl(): string
    {
        return rtrim((string) config('app.url'), '/').'/api/v1/payments/stripe/webhook';
    }
}
