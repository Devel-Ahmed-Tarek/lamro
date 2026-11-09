<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuantityDiscountTier extends Model
{
    protected $table = 'quantity_discount_tiers';

    protected $fillable = ['min_qty', 'percent_bps', 'combine_with_coupon', 'is_active'];

    protected function casts(): array
    {
        return [
            'combine_with_coupon' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
