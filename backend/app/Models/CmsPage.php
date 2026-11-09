<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsPage extends Model
{
    protected $fillable = ['slug', 'title', 'body', 'meta_title', 'meta_description', 'status'];

    protected function casts(): array
    {
        return [
            'title' => 'array',
            'body' => 'array',
        ];
    }
}
