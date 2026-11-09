<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'number',
        'user_id',
        'guest_email',
        'guest_name',
        'auction_id',
        'source',
        'status',
        'subtotal_cents',
        'discount_cents',
        'shipping_cents',
        'coupon_code',
        'shipping_method_id',
        'tax_cents',
        'total_cents',
        'tax_rate_bps',
        'currency',
        'shipping_name',
        'shipping_line1',
        'shipping_city',
        'shipping_postcode',
        'shipping_country',
        'notes',
        'tracking_number',
        'paid_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'paid_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    protected $appends = ['subtotal', 'tax', 'total', 'discount', 'shipping'];

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

    public function getDiscountAttribute(): float
    {
        return round(($this->discount_cents ?? 0) / 100, 2);
    }

    public function getShippingAttribute(): float
    {
        return round(($this->shipping_cents ?? 0) / 100, 2);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shippingMethod(): BelongsTo
    {
        return $this->belongsTo(ShippingMethod::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(OrderReturn::class);
    }

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }
}
