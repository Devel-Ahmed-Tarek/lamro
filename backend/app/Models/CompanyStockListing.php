<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class CompanyStockListing extends Model
{
    protected $fillable = [
        'user_id',
        'company_name',
        'contact_name',
        'email',
        'phone',
        'city',
        'country',
        'inventory_type',
        'description',
        'photos',
        'status',
        'admin_note',
        'handled_by',
        'handled_at',
    ];

    protected function casts(): array
    {
        return [
            'photos' => 'array',
            'handled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    /** @return list<string> */
    public function photoUrls(): array
    {
        return collect($this->photos ?? [])
            ->filter()
            ->map(fn ($path) => Storage::disk('public')->url($path))
            ->values()
            ->all();
    }
}
