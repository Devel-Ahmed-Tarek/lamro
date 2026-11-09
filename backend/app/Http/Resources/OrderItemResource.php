<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\OrderItem */
class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'sku' => $this->sku,
            'part_number' => $this->part_number,
            'name' => $this->name,
            'unit_price' => $this->unit_price,
            'unit_price_cents' => $this->unit_price_cents,
            'quantity' => $this->quantity,
            'line_total' => $this->line_total,
            'line_total_cents' => $this->line_total_cents,
        ];
    }
}
