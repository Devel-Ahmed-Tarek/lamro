<?php

namespace App\Events;

use App\Http\Resources\AuctionResource;
use App\Models\Auction;
use App\Models\Bid;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BidPlaced implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Auction $auction,
        public Bid $bid,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel('auction.'.$this->auction->id)];
    }

    public function broadcastAs(): string
    {
        return 'bid.placed';
    }

    public function broadcastWith(): array
    {
        $this->auction->load(['product.brand', 'product.category', 'bids' => fn ($q) => $q->with('user')->limit(20)]);
        $this->bid->load('user');

        return [
            'auction' => (new AuctionResource($this->auction))->resolve(),
            'bid' => [
                'id' => $this->bid->id,
                'amount' => $this->bid->amount,
                'amount_cents' => $this->bid->amount_cents,
                'is_proxy' => $this->bid->is_proxy,
                'bidder_label' => $this->bid->bidder_label,
                'created_at' => $this->bid->created_at?->toIso8601String(),
            ],
        ];
    }
}
