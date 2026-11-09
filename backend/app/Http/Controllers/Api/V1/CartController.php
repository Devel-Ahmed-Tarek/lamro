<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CartResource;
use App\Models\Product;
use App\Services\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(private CheckoutService $checkout) {}

    public function show(Request $request): JsonResponse
    {
        $cart = $this->checkout->cartFor($request->user())->load('items.product.brand');

        return response()->json(['data' => new CartResource($cart)]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'slug' => ['nullable', 'string'],
            'quantity' => ['required', 'integer', 'min:0'],
        ]);

        $product = isset($data['product_id'])
            ? Product::query()->findOrFail($data['product_id'])
            : Product::query()->where('slug', $data['slug'] ?? '')->firstOrFail();

        $cart = $this->checkout->upsertCartItem($request->user(), $product, (int) $data['quantity']);

        return response()->json(['data' => new CartResource($cart)]);
    }

    public function sync(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.slug' => ['required', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $cart = $this->checkout->cartFor($request->user());
        $cart->items()->delete();

        foreach ($data['items'] as $row) {
            $product = Product::query()->where('slug', $row['slug'])->first();
            if (! $product) {
                continue;
            }
            $this->checkout->upsertCartItem($request->user(), $product, (int) $row['quantity']);
        }

        $cart = $this->checkout->cartFor($request->user())->load('items.product.brand');

        return response()->json(['data' => new CartResource($cart)]);
    }

    public function clear(Request $request): JsonResponse
    {
        $cart = $this->checkout->cartFor($request->user());
        $cart->items()->delete();
        $cart->update(['coupon_code' => null]);

        return response()->json(['data' => new CartResource($cart->fresh()->load('items.product.brand'))]);
    }

    public function coupon(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:40'],
        ]);
        $cart = $this->checkout->applyCoupon($request->user(), $data['code'] ?? null);

        return response()->json(['data' => new CartResource($cart)]);
    }
}
