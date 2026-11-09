<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = str_contains($request->path(), '/admin/');

        $query = Brand::query()
            ->withCount(['products' => fn ($q) => $admin ? $q : $q->published()])
            ->orderBy('name');

        if (! $admin) {
            $query->where('is_active', true);
        }

        return response()->json([
            'data' => BrandResource::collection($query->get()),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', 'unique:brands,name'],
            'slug' => ['nullable', 'string', 'max:120', 'unique:brands,slug'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $brand = Brand::query()->create([
            'name' => $data['name'],
            'slug' => $data['slug'] ?? Str::slug($data['name']),
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json([
            'data' => new BrandResource($brand->loadCount('products')),
        ], 201);
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120', Rule::unique('brands', 'name')->ignore($brand->id)],
            'slug' => ['sometimes', 'string', 'max:120', Rule::unique('brands', 'slug')->ignore($brand->id)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (isset($data['name']) && ! isset($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $brand->update($data);

        return response()->json([
            'data' => new BrandResource($brand->fresh()->loadCount('products')),
        ]);
    }

    public function destroy(Brand $brand): JsonResponse
    {
        $brand->update(['is_active' => false]);

        return response()->json([
            'data' => new BrandResource($brand->fresh()->loadCount('products')),
        ]);
    }
}
