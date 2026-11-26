<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CmsBanner;
use App\Models\CmsPage;
use App\Services\AiProductService;
use App\Support\Locales;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CmsController extends Controller
{
    public function __construct(private AiProductService $ai) {}

    public function show(string $slug): JsonResponse
    {
        $page = CmsPage::query()->where('slug', $slug)->where('status', 'published')->firstOrFail();

        return response()->json(['data' => $this->present($page)]);
    }

    public function banners(): JsonResponse
    {
        return response()->json([
            'data' => CmsBanner::query()->where('is_active', true)->orderBy('sort')->get(),
        ]);
    }

    public function adminIndex(): JsonResponse
    {
        return response()->json([
            'data' => CmsPage::query()->orderBy('slug')->get()->map(fn (CmsPage $page) => $this->present($page)),
        ]);
    }

    public function adminUpdate(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $localeRules = [];
        foreach (Locales::all() as $locale) {
            $localeRules["title.{$locale}"] = ['nullable', 'string', 'max:255'];
            $localeRules["body.{$locale}"] = ['nullable', 'string', 'max:50000'];
            $localeRules["meta_title.{$locale}"] = ['nullable', 'string', 'max:255'];
            $localeRules["meta_description.{$locale}"] = ['nullable', 'string', 'max:500'];
        }

        $data = $request->validate(array_merge([
            'title' => ['sometimes', 'array'],
            'body' => ['sometimes', 'array'],
            'meta_title' => ['nullable'],
            'meta_description' => ['nullable'],
            'status' => ['nullable', Rule::in(['draft', 'published'])],
            'auto_translate' => ['nullable', 'boolean'],
            'source_locale' => ['nullable', 'string', 'in:'.implode(',', Locales::all())],
        ], $localeRules));

        $payload = $this->maybeTranslate($data, $cmsPage);
        $cmsPage->update($payload);

        return response()->json(['data' => $this->present($cmsPage->fresh() ?? $cmsPage)]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function maybeTranslate(array $data, CmsPage $existing): array
    {
        $auto = (bool) ($data['auto_translate'] ?? false);
        $source = (string) ($data['source_locale'] ?? 'en');
        unset($data['auto_translate'], $data['source_locale']);

        foreach (['title', 'body', 'meta_title', 'meta_description'] as $field) {
            if (array_key_exists($field, $data)) {
                if (is_string($data[$field])) {
                    $data[$field] = Locales::normalize([$source => $data[$field]]);
                } else {
                    $data[$field] = Locales::normalize(is_array($data[$field]) ? $data[$field] : []);
                }
            }
        }

        if (! $auto) {
            return $data;
        }

        if (! Locales::isValid($source)) {
            $source = Locales::fallback();
        }

        $translated = $this->ai->translateTaxonomyCopy([
            'name' => $data['title'] ?? Locales::normalize($existing->title ?? []),
            'description' => $data['body'] ?? Locales::normalize($existing->body ?? []),
            'seo_title' => $data['meta_title'] ?? Locales::normalize($this->metaAsArray($existing->meta_title)),
            'seo_description' => $data['meta_description'] ?? Locales::normalize($this->metaAsArray($existing->meta_description)),
            'seo_keywords' => Locales::normalize([]),
        ], $source);

        $data['title'] = Locales::normalize($translated['name'] ?? []);
        $data['body'] = Locales::normalize($translated['description'] ?? []);
        $data['meta_title'] = Locales::normalize($translated['seo_title'] ?? []);
        $data['meta_description'] = Locales::normalize($translated['seo_description'] ?? []);

        return $data;
    }

    /** @return array<string, mixed> */
    private function present(CmsPage $page): array
    {
        return [
            'id' => $page->id,
            'slug' => $page->slug,
            'title' => Locales::normalize($page->title ?? []),
            'body' => Locales::normalize($page->body ?? []),
            'meta_title' => Locales::normalize($this->metaAsArray($page->meta_title)),
            'meta_description' => Locales::normalize($this->metaAsArray($page->meta_description)),
            'status' => $page->status,
            'updated_at' => $page->updated_at,
        ];
    }

    /** @return array<string, string> */
    private function metaAsArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $decoded;
            }

            return ['en' => $value, 'de' => $value];
        }

        return [];
    }
}
