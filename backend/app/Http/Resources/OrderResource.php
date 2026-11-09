<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'source' => $this->source,
            'status' => $this->status,
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'shipping' => $this->shipping,
            'tax' => $this->tax,
            'total' => $this->total,
            'subtotal_cents' => $this->subtotal_cents,
            'discount_cents' => $this->discount_cents,
            'shipping_cents' => $this->shipping_cents,
            'coupon_code' => $this->coupon_code,
            'tracking_number' => $this->tracking_number,
            'tax_cents' => $this->tax_cents,
            'total_cents' => $this->total_cents,
            'tax_rate_bps' => $this->tax_rate_bps,
            'currency' => $this->currency,
            'shipping_name' => $this->shipping_name,
            'shipping_line1' => $this->shipping_line1,
            'shipping_city' => $this->shipping_city,
            'shipping_postcode' => $this->shipping_postcode,
            'shipping_country' => $this->shipping_country,
            'notes' => $this->notes,
            'auction_id' => $this->auction_id,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'company_name' => $this->user->company_name,
            ]),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payment' => new PaymentResource($this->whenLoaded('payment')),
            'invoice' => new InvoiceResource($this->whenLoaded('invoice')),
        ];
    }
}
