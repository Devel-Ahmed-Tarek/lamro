<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\AuctionApplication */
class AuctionApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'auction_id' => $this->auction_id,
            'user_id' => $this->user_id,
            'status' => $this->status,
            'note' => $this->note,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'account_type' => $this->user->account_type,
                'company_name' => $this->user->company_name,
            ]),
            'auction' => $this->whenLoaded('auction', fn () => [
                'id' => $this->auction->id,
                'slug' => $this->auction->slug,
                'status' => $this->auction->status,
                'product_name' => $this->auction->product?->name,
            ]),
        ];
    }
}
