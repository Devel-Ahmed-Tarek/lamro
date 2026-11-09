<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsBanner extends Model
{
    protected $fillable = ['title', 'image_path', 'cta_url', 'sort', 'is_active'];

    protected function casts(): array
    {
        return [
            'title' => 'array',
            'is_active' => 'boolean',
        ];
    }
}
