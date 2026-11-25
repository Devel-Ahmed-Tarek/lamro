<?php

namespace App\Support;

class Locales
{
    /** @return list<string> */
    public static function all(): array
    {
        return array_values(config('i18n.locales', ['en', 'de']));
    }

    public static function fallback(): string
    {
        return (string) config('i18n.fallback', 'en');
    }

    public static function isValid(string $locale): bool
    {
        return in_array($locale, self::all(), true);
    }

    /**
     * Normalize a multilingual map to all known locales.
     *
     * @param  array<string, mixed>|null  $input
     * @return array<string, string>
     */
    public static function normalize(?array $input, string $default = ''): array
    {
        $input = $input ?? [];
        $out = [];
        foreach (self::all() as $locale) {
            $value = $input[$locale] ?? null;
            $out[$locale] = is_string($value) ? $value : $default;
        }

        return $out;
    }

    /**
     * True if at least one locale has a non-empty string.
     *
     * @param  array<string, mixed>|null  $input
     */
    public static function filled(?array $input): bool
    {
        foreach ($input ?? [] as $value) {
            if (is_string($value) && filled(trim($value))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Pick best available string for a locale.
     *
     * @param  array<string, mixed>|null  $input
     */
    public static function pick(?array $input, ?string $locale = null): string
    {
        $input = $input ?? [];
        $locale = $locale && self::isValid($locale) ? $locale : self::fallback();
        foreach ([$locale, self::fallback(), 'en', 'de', 'ar'] as $key) {
            $value = $input[$key] ?? null;
            if (is_string($value) && filled(trim($value))) {
                return $value;
            }
        }
        foreach ($input as $value) {
            if (is_string($value) && filled(trim($value))) {
                return $value;
            }
        }

        return '';
    }
}
