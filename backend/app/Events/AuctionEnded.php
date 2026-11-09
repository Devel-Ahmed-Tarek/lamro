<?php

namespace App\Events;

use App\Http\Resources\AuctionResource;
use App\Models\Auction;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AuctionEnded implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Auction $auction) {}

    public function broadcastOn(): array
    {
        return [new Channel('auction.'.$this->auction->id)];
    }

    public function broadcastAs(): string
    {
        return 'auction.ended';
    }

    public function broadcastWith(): array
    {
        $this->auction->load(['product.brand', 'product.category', 'winner']);

        return [
            'auction' => (new AuctionResource($this->auction))->resolve(),
        ];
    }
}
