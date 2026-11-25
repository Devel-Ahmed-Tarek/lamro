<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TaxCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaxCalculatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_eu_b2b_reverse_charge_zeroes_tax(): void
    {
        $user = User::factory()->create([
            'account_type' => 'business',
            'vat_id' => 'FR12345678901',
            'country' => 'FR',
        ]);

        $result = app(TaxCalculator::class)->forOrder($user, 10000, 'FR');

        $this->assertTrue($result['reverse_charge']);
        $this->assertSame(0, $result['tax_cents']);
        $this->assertSame(0, $result['tax_rate_bps']);
    }

    public function test_domestic_business_keeps_standard_tax(): void
    {
        $user = User::factory()->create([
            'account_type' => 'business',
            'vat_id' => 'DE123456789',
            'country' => 'DE',
        ]);

        $result = app(TaxCalculator::class)->forOrder($user, 10000, 'DE');

        $this->assertFalse($result['reverse_charge']);
        $this->assertGreaterThan(0, $result['tax_cents']);
    }
}
