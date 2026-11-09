<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_id',
        'sku',
        'part_number',
        'name',
        'unit_price_cents',
        'quantity',
        'line_total_cents',
    ];

    protected function casts(): array
    {
        return [
            'name' => 'array',
        ];
    }

    protected $appends = ['unit_price', 'line_total'];

    public function getUnitPriceAttribute(): float
    {
        return round($this->unit_price_cents / 100, 2);
    }

    public function getLineTotalAttribute(): float
    {
        return round($this->line_total_cents / 100, 2);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
