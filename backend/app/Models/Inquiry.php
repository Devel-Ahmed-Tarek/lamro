<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inquiry extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'auction_id',
        'type',
        'status',
        'guest_name',
        'guest_email',
        'offer_amount_cents',
        'quantity',
        'message',
        'admin_reply',
        'handled_by',
        'handled_at',
    ];

    protected function casts(): array
    {
        return [
            'handled_at' => 'datetime',
        ];
    }

    protected $appends = ['offer_amount'];

    public function getOfferAmountAttribute(): ?float
    {
        return $this->offer_amount_cents === null ? null : round($this->offer_amount_cents / 100, 2);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
