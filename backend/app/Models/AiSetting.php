<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiSetting extends Model
{
    protected $fillable = [
        'provider',
        'groq_key',
        'groq_model',
        'gemini_key',
        'gemini_model',
        'openai_key',
        'openai_model',
    ];

    protected function casts(): array
    {
        return [
            'groq_key' => 'encrypted',
            'gemini_key' => 'encrypted',
            'openai_key' => 'encrypted',
        ];
    }

    /** @return list<string> */
    public static function providers(): array
    {
        return ['demo', 'groq', 'gemini', 'openai'];
    }

    public static function current(): self
    {
        $row = static::query()->first();
        if ($row) {
            return $row;
        }

        return static::query()->create([
            'provider' => strtolower((string) config('services.ai.provider', 'demo')) ?: 'demo',
            'groq_key' => config('services.ai.groq_key') ?: null,
            'groq_model' => config('services.ai.groq_model') ?: 'llama-3.1-8b-instant',
            'gemini_key' => config('services.ai.gemini_key') ?: null,
            'gemini_model' => config('services.ai.gemini_model') ?: 'gemini-2.0-flash',
            'openai_key' => config('services.ai.openai_key') ?: null,
            'openai_model' => config('services.ai.openai_model') ?: 'gpt-4o-mini',
        ]);
    }

    public function resolvedProvider(): string
    {
        $provider = strtolower((string) ($this->provider ?: 'demo'));
        if (! in_array($provider, self::providers(), true)) {
            return 'demo';
        }
        if ($provider === 'demo') {
            return 'demo';
        }
        if ($this->keyFor($provider) === '') {
            return 'demo';
        }

        return $provider;
    }

    public function keyFor(string $provider): string
    {
        $fromDb = match ($provider) {
            'groq' => (string) ($this->groq_key ?? ''),
            'gemini' => (string) ($this->gemini_key ?? ''),
            'openai' => (string) ($this->openai_key ?? ''),
            default => '',
        };
        $fromDb = trim($fromDb);
        if ($fromDb !== '') {
            return $fromDb;
        }

        return trim((string) match ($provider) {
            'groq' => config('services.ai.groq_key', ''),
            'gemini' => config('services.ai.gemini_key', ''),
            'openai' => config('services.ai.openai_key', ''),
            default => '',
        });
    }

    public function modelFor(string $provider): string
    {
        return match ($provider) {
            'groq' => trim((string) ($this->groq_model ?: config('services.ai.groq_model', 'llama-3.1-8b-instant'))) ?: 'llama-3.1-8b-instant',
            'gemini' => trim((string) ($this->gemini_model ?: config('services.ai.gemini_model', 'gemini-2.0-flash'))) ?: 'gemini-2.0-flash',
            'openai' => trim((string) ($this->openai_model ?: config('services.ai.openai_model', 'gpt-4o-mini'))) ?: 'gpt-4o-mini',
            default => '',
        };
    }

    public static function mask(?string $value): ?string
    {
        if (! $value) {
            return null;
        }
        $len = strlen($value);
        if ($len <= 8) {
            return str_repeat('•', $len);
        }

        return substr($value, 0, 4).str_repeat('•', max(4, $len - 8)).substr($value, -4);
    }
}
