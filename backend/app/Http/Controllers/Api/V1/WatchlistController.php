<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Watchlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WatchlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = Watchlist::query()->where('user_id', $request->user()->id)->with('product.brand')->latest()->get();

        return response()->json([
            'data' => $items->map(fn (Watchlist $w) => [
                'id' => $w->id,
                'product' => $w->product ? new ProductResource($w->product) : null,
            ]),
        ]);
    }

    public function toggle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['nullable', 'integer', 'exists:products,id', 'required_without:slug'],
            'slug' => ['nullable', 'string', 'required_without:product_id'],
        ]);

        $productId = $data['product_id'] ?? null;
        if (! $productId && ! empty($data['slug'])) {
            $productId = Product::query()->where('slug', $data['slug'])->value('id');
        }
        abort_unless($productId, 404);

        $existing = Watchlist::query()
            ->where('user_id', $request->user()->id)
            ->where('product_id', $productId)
            ->first();
        if ($existing) {
            $existing->delete();

            return response()->json(['data' => ['watching' => false, 'product_id' => $productId]]);
        }
        Watchlist::query()->create([
            'user_id' => $request->user()->id,
            'product_id' => $productId,
        ]);

        return response()->json(['data' => ['watching' => true, 'product_id' => $productId]]);
    }
}
