<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductMediaResource;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = str_contains($request->path(), '/admin/');

        $query = Product::query()
            ->with(['category', 'brand', 'media', 'specs'])
            ->when(! $admin, fn ($q) => $q->published());

        if ($q = trim((string) $request->query('q', ''))) {
            $like = '%'.mb_strtolower($q).'%';
            $query->where(function ($builder) use ($like) {
                $builder
                    ->whereRaw('LOWER(part_number) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(sku) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(model) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(serial) LIKE ?', [$like])
                    ->orWhereRaw("LOWER(json_extract(name, '$.en')) LIKE ?", [$like])
                    ->orWhereRaw("LOWER(json_extract(name, '$.de')) LIKE ?", [$like])
                    ->orWhereHas('brand', fn ($b) => $b->whereRaw('LOWER(name) LIKE ?', [$like]));
            });
        }

        if ($category = $request->query('category')) {
            $query->whereHas('category', fn ($c) => $c->where('slug', $category));
        }

        if ($brand = $request->query('brand')) {
            $query->whereHas('brand', function ($b) use ($brand) {
                $b->where('name', $brand)->orWhere('slug', Str::slug((string) $brand));
            });
        }

        if ($condition = $request->query('condition')) {
            $query->where('condition', $condition);
        }

        if ($admin && ($status = $request->query('status'))) {
            $query->where('status', $status);
        }

        $sort = $request->query('sort', 'new');
        match ($sort) {
            'price' => $query->orderBy('price_cents'),
            'price_desc' => $query->orderByDesc('price_cents'),
            'name' => $query->orderByRaw("json_extract(name, '$.en')"),
            default => $query->orderByDesc('id'),
        };

        $products = $query->paginate(min(100, max(1, (int) $request->query('per_page', 50))));

        return response()->json([
            'data' => ProductResource::collection($products->items()),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::query()
            ->published()
            ->where('slug', $slug)
            ->with(['category', 'brand', 'media', 'specs'])
            ->firstOrFail();

        return response()->json([
            'data' => new ProductResource($product),
        ]);
    }

    public function adminShow(Product $product): JsonResponse
    {
        $product->load(['category', 'brand', 'media', 'specs']);

        return response()->json([
            'data' => new ProductResource($product),
        ]);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = DB::transaction(function () use ($request) {
            $payload = $this->normalizePayload($request->validated());
            $product = Product::query()->create($payload);
            $this->syncSpecs($product, $request->input('specs', []));

            return $product->load(['category', 'brand', 'media', 'specs']);
        });

        return response()->json([
            'data' => new ProductResource($product),
        ], 201);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product = DB::transaction(function () use ($request, $product) {
            $payload = $this->normalizePayload($request->validated(), $product);
            $product->update($payload);

            if ($request->exists('specs')) {
                $this->syncSpecs($product, $request->input('specs', []));
            }

            return $product->fresh()->load(['category', 'brand', 'media', 'specs']);
        });

        return response()->json([
            'data' => new ProductResource($product),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->update(['status' => 'archived']);

        return response()->json([
            'data' => new ProductResource($product->fresh()->load(['category', 'brand', 'media', 'specs'])),
        ]);
    }

    public function publish(Product $product): JsonResponse
    {
        $this->assertPublishable($product);
        $product->update(['status' => 'published']);

        return response()->json([
            'data' => new ProductResource($product->fresh()->load(['category', 'brand', 'media', 'specs'])),
        ]);
    }

    public function unpublish(Product $product): JsonResponse
    {
        $product->update(['status' => 'draft']);

        return response()->json([
            'data' => new ProductResource($product->fresh()->load(['category', 'brand', 'media', 'specs'])),
        ]);
    }

    public function archive(Product $product): JsonResponse
    {
        $product->update(['status' => 'archived']);

        return response()->json([
            'data' => new ProductResource($product->fresh()->load(['category', 'brand', 'media', 'specs'])),
        ]);
    }

    public function storeMedia(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:20480'],
            'type' => ['nullable', Rule::in(['image', 'video', 'document'])],
            'sort' => ['nullable', 'integer', 'min:0'],
        ]);

        $file = $request->file('file');
        $mime = (string) $file->getMimeType();
        $type = $data['type'] ?? (
            str_starts_with($mime, 'image/') ? 'image'
            : (str_starts_with($mime, 'video/') ? 'video' : 'document')
        );

        $path = $file->store("products/{$product->id}", 'public');
        $sort = $data['sort'] ?? ((int) $product->media()->max('sort') + 1);

        $media = $product->media()->create([
            'type' => $type,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'sort' => $sort,
        ]);

        return response()->json([
            'data' => new ProductMediaResource($media),
        ], 201);
    }

    public function destroyMedia(Product $product, ProductMedia $media): JsonResponse
    {
        abort_unless($media->product_id === $product->id, 404);

        Storage::disk('public')->delete($media->path);
        $media->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    /** @param  array<string, mixed>  $data */
    private function normalizePayload(array $data, ?Product $existing = null): array
    {
        if (array_key_exists('price', $data) && $data['price'] !== null && ! array_key_exists('price_cents', $data)) {
            $data['price_cents'] = (int) round(((float) $data['price']) * 100);
        }
        unset($data['price'], $data['specs']);

        $name = $data['name'] ?? $existing?->name ?? ['de' => 'Draft', 'en' => 'Draft'];
        $data['name'] = [
            'de' => $name['de'] ?? '',
            'en' => $name['en'] ?? '',
        ];

        if (empty($data['slug'])) {
            $base = Str::slug($data['name']['en'] ?: $data['name']['de'] ?: 'product');
            $slug = $base !== '' ? $base : 'product';
            $candidate = $slug;
            $i = 1;
            while (
                Product::query()
                    ->when($existing, fn ($q) => $q->where('id', '!=', $existing->id))
                    ->where('slug', $candidate)
                    ->exists()
            ) {
                $candidate = $slug.'-'.$i++;
            }
            $data['slug'] = $candidate;
        }

        foreach (['allow_cart', 'allow_buy_now', 'allow_offer', 'allow_quote', 'allow_inquiry'] as $flag) {
            if (array_key_exists($flag, $data)) {
                $data[$flag] = (bool) $data[$flag];
            }
        }

        if (! isset($data['status'])) {
            $data['status'] = $existing?->status ?? 'draft';
        }

        return $data;
    }

    /** @param  list<array{label?: array<string, string>, value?: string}>  $specs */
    private function syncSpecs(Product $product, array $specs): void
    {
        $product->specs()->delete();

        foreach (array_values($specs) as $index => $spec) {
            if (! is_array($spec) || blank($spec['value'] ?? null)) {
                continue;
            }

            $product->specs()->create([
                'label' => [
                    'de' => $spec['label']['de'] ?? '',
                    'en' => $spec['label']['en'] ?? '',
                ],
                'value' => (string) $spec['value'],
                'sort' => $index,
            ]);
        }
    }

    private function assertPublishable(Product $product): void
    {
        $missing = [];
        if (! $product->category_id) {
            $missing[] = 'category_id';
        }
        if (! $product->brand_id) {
            $missing[] = 'brand_id';
        }
        if (blank($product->part_number)) {
            $missing[] = 'part_number';
        }
        if (blank($product->sku)) {
            $missing[] = 'sku';
        }
        if (blank($product->condition)) {
            $missing[] = 'condition';
        }
        if (blank($product->testing)) {
            $missing[] = 'testing';
        }
        if (! filled($product->name['de'] ?? null) || ! filled($product->name['en'] ?? null)) {
            $missing[] = 'name';
        }

        if ($missing !== []) {
            abort(response()->json([
                'message' => 'Product is missing required fields for publish.',
                'errors' => collect($missing)->mapWithKeys(fn ($field) => [$field => ['Required to publish.']])->all(),
            ], 422));
        }
    }
}
