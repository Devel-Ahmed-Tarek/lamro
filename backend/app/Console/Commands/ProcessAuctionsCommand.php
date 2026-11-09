<?php

namespace App\Console\Commands;

use App\Services\PlaceBidService;
use Illuminate\Console\Command;

class ProcessAuctionsCommand extends Command
{
    protected $signature = 'auctions:process';

    protected $description = 'Open due auctions and close expired live auctions';

    public function handle(PlaceBidService $service): int
    {
        $opened = $service->openDue();
        $closed = $service->closeDue();
        $this->info("Opened {$opened}, closed {$closed}.");

        return self::SUCCESS;
    }
}
