<?php

namespace App\Events;

use App\Models\Auction;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AuctionExtended implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Auction $auction) {}

    public function broadcastOn(): array
    {
        return [new Channel('auction.'.$this->auction->id)];
    }

    public function broadcastAs(): string
    {
        return 'auction.extended';
    }

    public function broadcastWith(): array
    {
        return [
            'auction_id' => $this->auction->id,
            'ends_at' => $this->auction->ends_at?->toIso8601String(),
            'ends_in_seconds' => $this->auction->ends_in_seconds,
            'version' => $this->auction->version,
        ];
    }
}
