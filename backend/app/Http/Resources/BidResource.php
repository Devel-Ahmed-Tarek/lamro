<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Bid */
class BidResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'auction_id' => $this->auction_id,
            'amount' => $this->amount,
            'amount_cents' => $this->amount_cents,
            'is_proxy' => $this->is_proxy,
            'bidder_label' => $this->bidder_label,
            'user_id' => $this->when($request->user()?->isStaff(), $this->user_id),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
