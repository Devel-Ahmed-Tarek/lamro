<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InboxNotification extends Model
{
    protected $table = 'notifications_inbox';

    protected $fillable = ['user_id', 'type', 'title', 'body', 'meta', 'href', 'read_at'];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
