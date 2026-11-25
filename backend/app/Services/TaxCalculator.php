<?php

namespace App\Services;

use App\Models\TaxSetting;
use App\Models\User;

class TaxCalculator
{
    /** @var list<string> */
    private const EU = [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
        'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    ];

    /**
     * @return array{tax_cents:int,tax_rate_bps:int,reverse_charge:bool,currency:string,note:?string}
     */
    public function forOrder(User $user, int $taxableCents, ?string $shippingCountry = null): array
    {
        $tax = TaxSetting::current();
        $buyerCountry = strtoupper((string) ($shippingCountry ?: $user->country ?: 'DE'));
        $sellerCountry = strtoupper((string) ($tax->country ?? 'DE'));
        if (strlen($sellerCountry) !== 2) {
            $sellerCountry = 'DE';
        }

        $vatId = strtoupper(preg_replace('/\s+/', '', (string) ($user->vat_id ?? '')) ?? '');
        $isBusiness = ($user->account_type ?? '') === 'business' && $vatId !== '';
        $vatLooksValid = (bool) preg_match('/^[A-Z]{2}[A-Z0-9]{8,12}$/', $vatId);
        $crossBorderEu = in_array($buyerCountry, self::EU, true)
            && in_array($sellerCountry, self::EU, true)
            && $buyerCountry !== $sellerCountry;

        if ($isBusiness && $vatLooksValid && $crossBorderEu) {
            return [
                'tax_cents' => 0,
                'tax_rate_bps' => 0,
                'reverse_charge' => true,
                'currency' => $tax->currency,
                'note' => 'VAT reverse charge (Art. 196 Directive 2006/112/EC). Customer VAT '.$vatId.'.',
            ];
        }

        $rate = (int) $tax->rate_bps;

        return [
            'tax_cents' => (int) round($taxableCents * $rate / 10000),
            'tax_rate_bps' => $rate,
            'reverse_charge' => false,
            'currency' => $tax->currency,
            'note' => null,
        ];
    }
}
