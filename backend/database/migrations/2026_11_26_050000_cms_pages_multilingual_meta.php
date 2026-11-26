<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cms_pages')) {
            return;
        }

        $locales = array_values(config('i18n.locales', ['en', 'de', 'ar']));

        foreach (DB::table('cms_pages')->get() as $row) {
            $title = $this->asLocaleMap($row->title ?? null, $locales);
            $body = $this->asLocaleMap($row->body ?? null, $locales);
            $metaTitle = $this->metaToMap($row->meta_title ?? null, $locales);
            $metaDescription = $this->metaToMap($row->meta_description ?? null, $locales);

            DB::table('cms_pages')->where('id', $row->id)->update([
                'title' => json_encode($title, JSON_UNESCAPED_UNICODE),
                'body' => json_encode($body, JSON_UNESCAPED_UNICODE),
                'meta_title' => json_encode($metaTitle, JSON_UNESCAPED_UNICODE),
                'meta_description' => json_encode($metaDescription, JSON_UNESCAPED_UNICODE),
            ]);
        }
    }

    public function down(): void
    {
        // Irreversible content reshape — leave columns as text.
    }

    /**
     * @param  list<string>  $locales
     * @return array<string, string>
     */
    private function asLocaleMap(mixed $value, array $locales): array
    {
        $decoded = is_string($value) ? json_decode($value, true) : $value;
        if (! is_array($decoded)) {
            $decoded = [];
        }
        $out = [];
        foreach ($locales as $locale) {
            $out[$locale] = is_string($decoded[$locale] ?? null) ? (string) $decoded[$locale] : '';
        }

        return $out;
    }

    /**
     * @param  list<string>  $locales
     * @return array<string, string>
     */
    private function metaToMap(mixed $value, array $locales): array
    {
        if (is_string($value) && $value !== '' && $value[0] !== '{' && $value[0] !== '[') {
            $out = [];
            foreach ($locales as $locale) {
                $out[$locale] = in_array($locale, ['en', 'de'], true) ? $value : '';
            }

            return $out;
        }

        return $this->asLocaleMap($value, $locales);
    }
};
