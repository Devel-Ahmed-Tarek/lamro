<?php

namespace Tests\Feature;

use App\Models\QuantityDiscountTier;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_quantity_discount_uses_cart_total_qty(): void
    {
        QuantityDiscountTier::query()->delete();
        QuantityDiscountTier::query()->create([
            'min_qty' => 5,
            'percent_bps' => 1000,
            'combine_with_coupon' => true,
            'is_active' => true,
        ]);

        $lines = collect([
            (object) ['quantity' => 3, 'price_cents' => 1000],
            (object) ['quantity' => 2, 'price_cents' => 1000],
        ]);

        $result = app(PricingService::class)->discounts($lines, null);

        // 5 units × 1000c = 5000c subtotal → 10% = 500c
        $this->assertSame(500, $result['qty_discount_cents']);

        $singleLargeLine = collect([
            (object) ['quantity' => 4, 'price_cents' => 1000],
        ]);
        $noTier = app(PricingService::class)->discounts($singleLargeLine, null);
        $this->assertSame(0, $noTier['qty_discount_cents']);
    }
}
