<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Invoice */
class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'number' => $this->number,
            'subtotal' => $this->subtotal,
            'tax' => $this->tax,
            'total' => $this->total,
            'subtotal_cents' => $this->subtotal_cents,
            'tax_cents' => $this->tax_cents,
            'total_cents' => $this->total_cents,
            'tax_rate_bps' => $this->tax_rate_bps,
            'snapshot' => $this->snapshot,
            'issued_at' => $this->issued_at?->toIso8601String(),
            'order' => new OrderResource($this->whenLoaded('order')),
        ];
    }
}
