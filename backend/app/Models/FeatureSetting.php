<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class FeatureSetting extends Model
{
    protected $fillable = ['key', 'enabled', 'meta'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'meta' => 'array',
        ];
    }

    public static function enabled(string $key, bool $default = true): bool
    {
        $map = Cache::remember('feature_settings_map', 30, function () {
            return static::query()->pluck('enabled', 'key')->all();
        });

        return array_key_exists($key, $map) ? (bool) $map[$key] : $default;
    }

    public static function flushCache(): void
    {
        Cache::forget('feature_settings_map');
    }
}
