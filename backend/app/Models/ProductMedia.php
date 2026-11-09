<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductMedia extends Model
{
    protected $table = 'product_media';

    protected $fillable = ['product_id', 'type', 'path', 'original_name', 'sort'];

    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        return url('/storage/'.$this->path);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
