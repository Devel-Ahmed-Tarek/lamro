<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\AiProductService;
use App\Support\Locales;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    public function __construct(private AiProductService $ai) {}

    public function index(Request $request): JsonResponse
    {
        $admin = str_contains($request->path(), '/admin/');

        $query = Category::query()
            ->withCount(['products' => fn ($q) => $admin ? $q : $q->published()])
            ->orderBy('sort')
            ->orderBy('id');

        if (! $admin) {
            $query->where('is_active', true);
        }

        return response()->json([
            'data' => CategoryResource::collection($query->get()),
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $category = Category::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->withCount(['products' => fn ($q) => $q->published()])
            ->firstOrFail();

        return response()->json([
            'data' => new CategoryResource($category),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data = $this->maybeTranslate($data);

        $label = Locales::pick($data['name']);
        if ($label === '') {
            throw ValidationException::withMessages(['name' => ['Name is required in at least one language.']]);
        }

        $category = Category::query()->create([
            'slug' => $data['slug'] ?? Str::slug($label),
            'name' => $data['name'],
            'description' => $data['description'] ?? Locales::normalize([]),
            'seo_title' => $data['seo_title'] ?? Locales::normalize([]),
            'seo_description' => $data['seo_description'] ?? Locales::normalize([]),
            'seo_keywords' => $data['seo_keywords'] ?? Locales::normalize([]),
            'is_active' => $data['is_active'] ?? true,
            'sort' => $data['sort'] ?? 0,
        ]);

        return response()->json([
            'data' => new CategoryResource($category->loadCount('products')),
        ], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $this->validated($request, $category);
        $data = $this->maybeTranslate($data, $category);

        $category->update($data);

        return response()->json([
            'data' => new CategoryResource($category->fresh()->loadCount('products')),
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        $category->update(['is_active' => false]);

        return response()->json([
            'data' => new CategoryResource($category->fresh()->loadCount('products')),
        ]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:categories,id'],
        ]);

        Category::query()->whereIn('id', $data['ids'])->update(['is_active' => false]);

        return response()->json(['data' => ['ok' => true, 'count' => count($data['ids'])]]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Category $category = null): array
    {
        $localeRules = [];
        foreach (Locales::all() as $locale) {
            foreach (['name', 'description', 'seo_title', 'seo_description', 'seo_keywords'] as $field) {
                $localeRules[$field.'.'.$locale] = ['nullable', 'string', 'max:'.($field === 'description' || $field === 'seo_description' ? 5000 : 255)];
            }
        }

        return $request->validate(array_merge([
            'name' => [$category ? 'sometimes' : 'required', 'array'],
            'description' => ['nullable', 'array'],
            'seo_title' => ['nullable', 'array'],
            'seo_description' => ['nullable', 'array'],
            'seo_keywords' => ['nullable', 'array'],
            'slug' => [
                'nullable',
                'string',
                'max:120',
                $category
                    ? Rule::unique('categories', 'slug')->ignore($category->id)
                    : Rule::unique('categories', 'slug'),
            ],
            'is_active' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'integer', 'min:0'],
            'auto_translate' => ['nullable', 'boolean'],
            'source_locale' => ['nullable', 'string', 'in:'.implode(',', Locales::all())],
        ], $localeRules));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function maybeTranslate(array $data, ?Category $existing = null): array
    {
        $auto = (bool) ($data['auto_translate'] ?? false);
        $source = (string) ($data['source_locale'] ?? 'en');
        unset($data['auto_translate'], $data['source_locale']);

        foreach (['name', 'description', 'seo_title', 'seo_description', 'seo_keywords'] as $field) {
            if (array_key_exists($field, $data)) {
                $data[$field] = Locales::normalize($data[$field] ?? []);
            } elseif (! $existing) {
                $data[$field] = Locales::normalize([]);
            }
        }

        if (! $auto) {
            return $data;
        }

        if (! Locales::isValid($source)) {
            $source = Locales::fallback();
        }

        $translated = $this->ai->translateTaxonomyCopy([
            'name' => $data['name'] ?? $existing?->name ?? [],
            'description' => $data['description'] ?? $existing?->description ?? [],
            'seo_title' => $data['seo_title'] ?? $existing?->seo_title ?? [],
            'seo_description' => $data['seo_description'] ?? $existing?->seo_description ?? [],
            'seo_keywords' => $data['seo_keywords'] ?? $existing?->seo_keywords ?? [],
        ], $source);
        unset($translated['provider']);

        return array_merge($data, $translated);
    }
}
