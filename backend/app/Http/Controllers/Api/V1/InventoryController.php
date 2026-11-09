<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->with(['brand', 'category'])->orderByDesc('id');

        if ($q = trim((string) $request->query('q', ''))) {
            $like = '%'.mb_strtolower($q).'%';
            $query->where(function ($builder) use ($like) {
                $builder
                    ->whereRaw('LOWER(part_number) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(sku) LIKE ?', [$like])
                    ->orWhereRaw("LOWER(json_extract(name, '$.en')) LIKE ?", [$like]);
            });
        }

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

    public function adjust(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'total_stock' => ['required', 'integer', 'min:0'],
        ]);

        $updated = $this->inventory->adjustStock($product, (int) $data['total_stock']);

        return response()->json([
            'data' => new ProductResource($updated->load(['brand', 'category'])),
        ]);
    }
}
