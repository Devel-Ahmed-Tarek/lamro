<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\CheckoutService;
use Illuminate\Console\Command;

class ReleaseExpiredOrderReservationsCommand extends Command
{
    protected $signature = 'orders:release-expired-reservations {--minutes=60 : Cancel unpaid orders older than this many minutes}';

    protected $description = 'Cancel abandoned pending_payment orders and release reserved stock';

    public function handle(CheckoutService $checkout): int
    {
        $minutes = max(5, (int) $this->option('minutes'));
        $cutoff = now()->subMinutes($minutes);

        $orders = Order::query()
            ->where('status', 'pending_payment')
            ->where('created_at', '<', $cutoff)
            ->with('user')
            ->orderBy('id')
            ->limit(200)
            ->get();

        $released = 0;
        foreach ($orders as $order) {
            $actor = $order->user;
            if (! $actor) {
                continue;
            }
            try {
                $checkout->cancelOrder($order, $actor);
                $released++;
            } catch (\Throwable $e) {
                $this->warn("Order {$order->number}: {$e->getMessage()}");
            }
        }

        $this->info("Released {$released} unpaid order reservation(s).");

        return self::SUCCESS;
    }
}
