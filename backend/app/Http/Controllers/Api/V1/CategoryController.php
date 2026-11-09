<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
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

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['nullable', 'string', 'max:120', 'unique:categories,slug'],
            'name' => ['required', 'array'],
            'name.de' => ['required', 'string', 'max:120'],
            'name.en' => ['required', 'string', 'max:120'],
            'is_active' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = $data['slug'] ?? Str::slug($data['name']['en'] ?: $data['name']['de']);

        $category = Category::query()->create([
            'slug' => $slug,
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? true,
            'sort' => $data['sort'] ?? 0,
        ]);

        return response()->json([
            'data' => new CategoryResource($category->loadCount('products')),
        ], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'slug' => ['sometimes', 'string', 'max:120', Rule::unique('categories', 'slug')->ignore($category->id)],
            'name' => ['sometimes', 'array'],
            'name.de' => ['required_with:name', 'string', 'max:120'],
            'name.en' => ['required_with:name', 'string', 'max:120'],
            'is_active' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'integer', 'min:0'],
        ]);

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
}
