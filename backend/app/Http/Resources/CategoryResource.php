<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Category */
class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description ?? [],
            'seo_title' => $this->seo_title ?? [],
            'seo_description' => $this->seo_description ?? [],
            'seo_keywords' => $this->seo_keywords ?? [],
            'is_active' => $this->is_active,
            'sort' => $this->sort,
            'count' => $this->when(isset($this->products_count), (int) $this->products_count),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
