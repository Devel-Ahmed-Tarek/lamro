<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Cart */
class CartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = $this->relationLoaded('items') ? $this->items : collect();

        return [
            'id' => $this->id,
            'coupon_code' => $this->coupon_code,
            'items' => $items->map(function ($item) {
                $product = $item->product;

                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'slug' => $product?->slug,
                    'name' => $product?->name,
                    'part_number' => $product?->part_number,
                    'sku' => $product?->sku,
                    'price' => $product?->price,
                    'price_cents' => $product?->price_cents,
                    'available_stock' => $product?->available_stock,
                    'line_total' => $product ? round($product->price * $item->quantity, 2) : 0,
                    'brand' => $product?->brand?->name,
                ];
            })->values(),
            'subtotal' => round($items->sum(fn ($item) => ($item->product?->price_cents ?? 0) * $item->quantity) / 100, 2),
            'item_count' => $items->sum('quantity'),
        ];
    }
}
