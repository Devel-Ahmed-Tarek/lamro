<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bid extends Model
{
    protected $fillable = [
        'auction_id',
        'user_id',
        'amount_cents',
        'is_proxy',
    ];

    protected function casts(): array
    {
        return [
            'is_proxy' => 'boolean',
        ];
    }

    protected $appends = ['amount', 'bidder_label'];

    public function getAmountAttribute(): float
    {
        return round($this->amount_cents / 100, 2);
    }

    public function getBidderLabelAttribute(): string
    {
        $name = $this->relationLoaded('user') ? ($this->user?->name ?? 'Bidder') : 'Bidder';
        $parts = preg_split('/\s+/', trim($name)) ?: ['B'];
        $first = mb_substr($parts[0] ?? 'B', 0, 1);
        $last = count($parts) > 1 ? mb_substr(end($parts), 0, 1) : '';

        return strtoupper($first).'···'.($last !== '' ? ' '.strtoupper($last).'.' : '');
    }

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
