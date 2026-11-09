<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Auction */
class AuctionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $application = null;
        if ($user && $this->relationLoaded('applications')) {
            $application = $this->applications->firstWhere('user_id', $user->id);
        }

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'type' => $this->type,
            'status' => $this->status,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'ends_in_seconds' => $this->ends_in_seconds,
            'starting_price' => $this->starting_price,
            'current_price' => $this->current_price,
            'increment' => $this->increment,
            'buy_now' => $this->buy_now,
            'has_reserve' => $this->has_reserve,
            'anti_snipe_window_sec' => $this->anti_snipe_window_sec,
            'anti_snipe_extend_sec' => $this->anti_snipe_extend_sec,
            'quantity' => $this->quantity,
            'version' => $this->version,
            'seller' => 'jala',
            'seller_name' => 'Jala',
            'ended_reason' => $this->ended_reason,
            'winner_user_id' => $this->winner_user_id,
            'winner_order_id' => $this->winner_order_id,
            'product' => $this->whenLoaded('product', function () {
                return [
                    'id' => $this->product->id,
                    'slug' => $this->product->slug,
                    'name' => $this->product->name,
                    'summary' => $this->product->summary,
                    'notes' => $this->product->notes,
                    'part_number' => $this->product->part_number,
                    'model' => $this->product->model,
                    'sku' => $this->product->sku,
                    'condition' => $this->product->condition,
                    'testing' => $this->product->testing,
                    'manufacturer' => $this->product->brand?->name,
                    'category_slug' => $this->product->category?->slug,
                ];
            }),
            'bids' => BidResource::collection($this->whenLoaded('bids')),
            'my_application' => $application ? [
                'id' => $application->id,
                'status' => $application->status,
                'note' => $application->note,
                'reviewed_at' => $application->reviewed_at?->toIso8601String(),
            ] : null,
            'applications_count' => $this->when(isset($this->applications_count), $this->applications_count),
            'bids_count' => $this->when(isset($this->bids_count), $this->bids_count),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
