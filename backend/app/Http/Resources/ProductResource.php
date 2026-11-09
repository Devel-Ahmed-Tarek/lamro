<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'summary' => $this->summary ?? ['de' => '', 'en' => ''],
            'notes' => $this->notes ?? ['de' => '', 'en' => ''],
            'part_number' => $this->part_number,
            'model' => $this->model,
            'sku' => $this->sku,
            'serial' => $this->serial,
            'condition' => $this->condition,
            'testing' => $this->testing,
            'price' => $this->price,
            'price_cents' => $this->price_cents,
            'total_stock' => $this->total_stock,
            'reserved_auction' => $this->reserved_auction,
            'reserved_order' => $this->reserved_order,
            'sold_quantity' => $this->sold_quantity,
            'available_stock' => $this->available_stock,
            'weight' => $this->weight,
            'dimensions' => $this->dimensions,
            'status' => $this->status,
            'allow_cart' => $this->allow_cart,
            'allow_buy_now' => $this->allow_buy_now,
            'allow_offer' => $this->allow_offer,
            'allow_quote' => $this->allow_quote,
            'allow_inquiry' => $this->allow_inquiry,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'brand' => new BrandResource($this->whenLoaded('brand')),
            'category_id' => $this->category_id,
            'brand_id' => $this->brand_id,
            'manufacturer' => $this->whenLoaded('brand', fn () => $this->brand?->name),
            'category_slug' => $this->whenLoaded('category', fn () => $this->category?->slug),
            'specs' => ProductSpecResource::collection($this->whenLoaded('specs')),
            'media' => ProductMediaResource::collection($this->whenLoaded('media')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
