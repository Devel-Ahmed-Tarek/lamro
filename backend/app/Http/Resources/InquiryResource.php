<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Inquiry */
class InquiryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'status' => $this->status,
            'guest_name' => $this->guest_name,
            'guest_email' => $this->guest_email,
            'offer_amount' => $this->offer_amount,
            'offer_amount_cents' => $this->offer_amount_cents,
            'quantity' => $this->quantity,
            'message' => $this->message,
            'admin_reply' => $this->admin_reply,
            'handled_at' => $this->handled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'product' => $this->whenLoaded('product', fn () => [
                'id' => $this->product->id,
                'slug' => $this->product->slug,
                'name' => $this->product->name,
                'part_number' => $this->product->part_number,
                'sku' => $this->product->sku,
            ]),
            'user' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null),
            'handler' => $this->whenLoaded('handler', fn () => $this->handler ? [
                'id' => $this->handler->id,
                'name' => $this->handler->name,
            ] : null),
        ];
    }
}
