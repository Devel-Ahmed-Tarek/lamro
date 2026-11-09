<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingMethod extends Model
{
    protected $fillable = ['code', 'name', 'price_cents', 'countries', 'is_active', 'sort'];

    protected function casts(): array
    {
        return [
            'name' => 'array',
            'is_active' => 'boolean',
        ];
    }

    protected $appends = ['price'];

    public function getPriceAttribute(): float
    {
        return round($this->price_cents / 100, 2);
    }
}
