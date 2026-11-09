<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'method',
        'status',
        'amount_cents',
        'refunded_cents',
        'currency',
        'reference',
        'provider_id',
        'refund_provider_id',
        'checkout_url',
        'demo_token',
        'reviewed_by',
        'reviewed_at',
        'refunded_at',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }

    protected $appends = ['amount'];

    public function getAmountAttribute(): float
    {
        return round($this->amount_cents / 100, 2);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
