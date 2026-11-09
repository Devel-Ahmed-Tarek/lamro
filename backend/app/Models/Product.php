<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'category_id',
        'brand_id',
        'slug',
        'name',
        'summary',
        'notes',
        'part_number',
        'model',
        'sku',
        'serial',
        'condition',
        'testing',
        'price_cents',
        'total_stock',
        'reserved_auction',
        'reserved_order',
        'sold_quantity',
        'weight',
        'dimensions',
        'status',
        'allow_cart',
        'allow_buy_now',
        'allow_offer',
        'allow_quote',
        'allow_inquiry',
    ];

    protected function casts(): array
    {
        return [
            'name' => 'array',
            'summary' => 'array',
            'notes' => 'array',
            'allow_cart' => 'boolean',
            'allow_buy_now' => 'boolean',
            'allow_offer' => 'boolean',
            'allow_quote' => 'boolean',
            'allow_inquiry' => 'boolean',
        ];
    }

    protected $appends = ['available_stock', 'price'];

    public function getAvailableStockAttribute(): int
    {
        return max(0, (int) $this->total_stock - (int) $this->reserved_auction - (int) $this->reserved_order);
    }

    public function getPriceAttribute(): float
    {
        return round(((int) $this->price_cents) / 100, 2);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function specs(): HasMany
    {
        return $this->hasMany(ProductSpec::class)->orderBy('sort');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ProductMedia::class)->orderBy('sort');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }
}
