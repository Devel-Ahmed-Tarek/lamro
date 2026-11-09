<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\QuantityDiscountTier;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class PricingService
{
    /**
     * @param  Collection<int, object{quantity:int,price_cents:int}>  $lines
     * @return array{qty_discount_cents:int,coupon_discount_cents:int,discount_cents:int,coupon:?Coupon,combine:bool}
     */
    public function discounts(Collection $lines, ?string $couponCode, ?User $user = null): array
    {
        $subtotal = (int) $lines->sum(fn ($line) => $line->price_cents * $line->quantity);
        $maxQty = (int) $lines->max('quantity');

        $tier = QuantityDiscountTier::query()
            ->where('is_active', true)
            ->where('min_qty', '<=', max(1, $maxQty))
            ->orderByDesc('min_qty')
            ->first();

        $qtyDiscount = 0;
        $combine = false;
        if ($tier) {
            $qtyDiscount = (int) round($subtotal * $tier->percent_bps / 10000);
            $combine = (bool) $tier->combine_with_coupon;
        }

        $coupon = null;
        $couponDiscount = 0;
        if ($couponCode) {
            $coupon = $this->resolveCoupon($couponCode, $user, $subtotal);
            $couponDiscount = $coupon->type === 'percent'
                ? (int) round($subtotal * $coupon->value / 10000)
                : min($subtotal, (int) $coupon->value);

            if ($qtyDiscount > 0 && ! $combine) {
                // take the better of the two
                if ($couponDiscount >= $qtyDiscount) {
                    $qtyDiscount = 0;
                } else {
                    $couponDiscount = 0;
                    $coupon = null;
                }
            }
        }

        return [
            'qty_discount_cents' => $qtyDiscount,
            'coupon_discount_cents' => $couponDiscount,
            'discount_cents' => $qtyDiscount + $couponDiscount,
            'coupon' => $coupon,
            'combine' => $combine,
        ];
    }

    public function resolveCoupon(string $code, ?User $user, int $subtotalCents): Coupon
    {
        $coupon = Coupon::query()->whereRaw('UPPER(code) = ?', [strtoupper($code)])->first();
        if (! $coupon || ! $coupon->is_active) {
            throw ValidationException::withMessages(['coupon' => ['Coupon is invalid.']]);
        }
        if ($coupon->starts_at && $coupon->starts_at->isFuture()) {
            throw ValidationException::withMessages(['coupon' => ['Coupon is not active yet.']]);
        }
        if ($coupon->ends_at && $coupon->ends_at->isPast()) {
            throw ValidationException::withMessages(['coupon' => ['Coupon has expired.']]);
        }
        if ($coupon->max_uses !== null && $coupon->used_count >= $coupon->max_uses) {
            throw ValidationException::withMessages(['coupon' => ['Coupon usage limit reached.']]);
        }
        if ($coupon->user_id && (! $user || $user->id !== $coupon->user_id)) {
            throw ValidationException::withMessages(['coupon' => ['Coupon is not available for this account.']]);
        }
        if ($subtotalCents < $coupon->min_subtotal_cents) {
            throw ValidationException::withMessages(['coupon' => ['Order below coupon minimum.']]);
        }

        return $coupon;
    }
}
