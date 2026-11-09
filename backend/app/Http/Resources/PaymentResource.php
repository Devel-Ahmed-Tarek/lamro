<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Payment */
class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'method' => $this->method,
            'status' => $this->status,
            'amount' => $this->amount,
            'amount_cents' => $this->amount_cents,
            'refunded_cents' => $this->refunded_cents,
            'refunded' => round(($this->refunded_cents ?? 0) / 100, 2),
            'currency' => $this->currency,
            'reference' => $this->reference,
            'provider_id' => $this->provider_id,
            'refund_provider_id' => $this->refund_provider_id,
            'checkout_url' => $this->checkout_url,
            'refunded_at' => $this->refunded_at?->toIso8601String(),
            'note' => $this->note,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'order' => new OrderResource($this->whenLoaded('order')),
            'reviewer' => $this->whenLoaded('reviewer', fn () => [
                'id' => $this->reviewer->id,
                'name' => $this->reviewer->name,
            ]),
        ];
    }
}
