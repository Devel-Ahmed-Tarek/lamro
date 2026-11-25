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
        try {
            Schema::table('brands', function (Blueprint $table) {
                $table->dropUnique(['name']);
            });
        } catch (\Throwable) {
            // Index may already be absent.
        }

        // Widen name before writing JSON payloads.
        try {
            DB::statement('ALTER TABLE brands MODIFY name LONGTEXT NOT NULL');
        } catch (\Throwable) {
            // SQLite / already widened.
        }

        Schema::table('brands', function (Blueprint $table) {
            if (! Schema::hasColumn('brands', 'description')) {
                $table->json('description')->nullable()->after('name');
            }
            if (! Schema::hasColumn('brands', 'seo_title')) {
                $table->json('seo_title')->nullable()->after('description');
            }
            if (! Schema::hasColumn('brands', 'seo_description')) {
                $table->json('seo_description')->nullable()->after('seo_title');
            }
            if (! Schema::hasColumn('brands', 'seo_keywords')) {
                $table->json('seo_keywords')->nullable()->after('seo_description');
            }
        });

        $brands = DB::table('brands')->select('id', 'name')->get();
        foreach ($brands as $brand) {
            $raw = $brand->name;
            if (is_string($raw) && str_starts_with(ltrim($raw), '{')) {
                $decoded = json_decode($raw, true);
                $label = is_array($decoded)
                    ? (string) ($decoded['en'] ?? $decoded['de'] ?? reset($decoded) ?: '')
                    : (string) $raw;
                $map = is_array($decoded) ? Locales::normalize($decoded, $label) : Locales::normalize([], (string) $raw);
            } else {
                $label = is_string($raw) ? $raw : '';
                $map = Locales::normalize([]);
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

        try {
            DB::statement('ALTER TABLE brands MODIFY name JSON NOT NULL');
        } catch (\Throwable) {
            // SQLite keeps text JSON.
        }

        Schema::table('categories', function (Blueprint $table) {
            if (! Schema::hasColumn('categories', 'description')) {
                $table->json('description')->nullable()->after('name');
            }
            if (! Schema::hasColumn('categories', 'seo_title')) {
                $table->json('seo_title')->nullable()->after('description');
            }
            if (! Schema::hasColumn('categories', 'seo_description')) {
                $table->json('seo_description')->nullable()->after('seo_title');
            }
            if (! Schema::hasColumn('categories', 'seo_keywords')) {
                $table->json('seo_keywords')->nullable()->after('seo_description');
            }
        });

        $categories = DB::table('categories')->select('id')->get();
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
            foreach (['description', 'seo_title', 'seo_description', 'seo_keywords'] as $column) {
                if (Schema::hasColumn('brands', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
        Schema::table('categories', function (Blueprint $table) {
            foreach (['description', 'seo_title', 'seo_description', 'seo_keywords'] as $column) {
                if (Schema::hasColumn('categories', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
