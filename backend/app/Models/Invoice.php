<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'order_id',
        'number',
        'subtotal_cents',
        'tax_cents',
        'total_cents',
        'tax_rate_bps',
        'snapshot',
        'issued_at',
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'issued_at' => 'datetime',
        ];
    }

    protected $appends = ['subtotal', 'tax', 'total'];

    public function getSubtotalAttribute(): float
    {
        return round($this->subtotal_cents / 100, 2);
    }

    public function getTaxAttribute(): float
    {
        return round($this->tax_cents / 100, 2);
    }

    public function getTotalAttribute(): float
    {
        return round($this->total_cents / 100, 2);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
