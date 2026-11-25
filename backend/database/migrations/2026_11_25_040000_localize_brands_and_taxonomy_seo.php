<?php

use App\Support\Locales;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Brands: name becomes localized JSON + SEO/description fields.
        try {
            Schema::table('brands', function (Blueprint $table) {
                $table->dropUnique(['name']);
            });
        } catch (\Throwable) {
            // Index may already be absent on some environments.
        }

        Schema::table('brands', function (Blueprint $table) {
            $table->json('description')->nullable()->after('name');
            $table->json('seo_title')->nullable()->after('description');
            $table->json('seo_description')->nullable()->after('seo_title');
            $table->json('seo_keywords')->nullable()->after('seo_description');
        });

        $brands = DB::table('brands')->select('id', 'name')->get();
        foreach ($brands as $brand) {
            $raw = $brand->name;
            if (is_string($raw) && str_starts_with(ltrim($raw), '{')) {
                $decoded = json_decode($raw, true);
                $map = is_array($decoded) ? Locales::normalize($decoded, (string) ($decoded['en'] ?? $decoded['de'] ?? reset($decoded) ?: '')) : Locales::normalize([], (string) $raw);
            } else {
                $label = is_string($raw) ? $raw : '';
                $map = Locales::normalize([], $label);
                // Prefer keeping brand names identical across locales (proper nouns).
                foreach (array_keys($map) as $locale) {
                    $map[$locale] = $label;
                }
            }

            DB::table('brands')->where('id', $brand->id)->update([
                'name' => json_encode($map, JSON_UNESCAPED_UNICODE),
                'description' => json_encode(Locales::normalize([]), JSON_UNESCAPED_UNICODE),
                'seo_title' => json_encode(Locales::normalize([]), JSON_UNESCAPED_UNICODE),
                'seo_description' => json_encode(Locales::normalize([]), JSON_UNESCAPED_UNICODE),
                'seo_keywords' => json_encode(Locales::normalize([]), JSON_UNESCAPED_UNICODE),
            ]);
        }

        // MySQL/MariaDB: convert string column to JSON if still string-typed.
        try {
            DB::statement('ALTER TABLE brands MODIFY name JSON NOT NULL');
        } catch (\Throwable) {
            // SQLite keeps text JSON — fine with Eloquent array cast.
        }

        Schema::table('categories', function (Blueprint $table) {
            $table->json('description')->nullable()->after('name');
            $table->json('seo_title')->nullable()->after('description');
            $table->json('seo_description')->nullable()->after('seo_title');
            $table->json('seo_keywords')->nullable()->after('seo_description');
        });

        $categories = DB::table('categories')->select('id', 'name')->get();
        foreach ($categories as $category) {
            DB::table('categories')->where('id', $category->id)->update([
                'description' => json_encode(Locales::normalize([]), JSON_UNESCAPED_UNICODE),
                'seo_title' => json_encode(Locales::normalize([]), JSON_UNESCAPED_UNICODE),
                'seo_description' => json_encode(Locales::normalize([]), JSON_UNESCAPED_UNICODE),
                'seo_keywords' => json_encode(Locales::normalize([]), JSON_UNESCAPED_UNICODE),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            $table->dropColumn(['description', 'seo_title', 'seo_description', 'seo_keywords']);
        });
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['description', 'seo_title', 'seo_description', 'seo_keywords']);
        });
    }
};
