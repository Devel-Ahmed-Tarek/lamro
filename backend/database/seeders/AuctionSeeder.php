<?php

namespace Database\Seeders;

use App\Models\Auction;
use App\Models\Product;
use Illuminate\Database\Seeder;

class AuctionSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'slug' => 'g120c-live',
                'product' => 'sinamics-g120c',
                'type' => 'live',
                'status' => 'live',
                'starts_at' => now()->subHour(),
                'ends_at' => now()->addMinutes(46),
                'starting' => 280,
                'current' => 280,
                'increment' => 10,
                'reserve' => 350,
                'buy_now' => 610,
            ],
            [
                'slug' => 's7-timed',
                'product' => 's7-1515',
                'type' => 'timed',
                'status' => 'live',
                'starts_at' => now()->subHours(2),
                'ends_at' => now()->addMinutes(180),
                'starting' => 900,
                'current' => 900,
                'increment' => 20,
                'reserve' => 1100,
                'buy_now' => null,
            ],
            [
                'slug' => 'acs580-live',
                'product' => 'acs580',
                'type' => 'live',
                'status' => 'live',
                'starts_at' => now()->subMinutes(30),
                'ends_at' => now()->addMinutes(300),
                'starting' => 250,
                'current' => 250,
                'increment' => 10,
                'reserve' => null,
                'buy_now' => 690,
            ],
            [
                'slug' => 'fanuc-upcoming',
                'product' => 'fanuc-servo',
                'type' => 'scheduled',
                'status' => 'scheduled',
                'starts_at' => now()->addHours(26),
                'ends_at' => now()->addHours(50),
                'starting' => 400,
                'current' => 400,
                'increment' => 20,
                'reserve' => 500,
                'buy_now' => null,
            ],
        ];

        foreach ($items as $item) {
            $product = Product::query()->where('slug', $item['product'])->first();
            if (! $product) {
                continue;
            }

            $auction = Auction::query()->updateOrCreate(
                ['slug' => $item['slug']],
                [
                    'product_id' => $product->id,
                    'type' => $item['type'],
                    'status' => $item['status'],
                    'starts_at' => $item['starts_at'],
                    'ends_at' => $item['ends_at'],
                    'starting_price_cents' => (int) round($item['starting'] * 100),
                    'current_price_cents' => (int) round($item['current'] * 100),
                    'increment_cents' => (int) round($item['increment'] * 100),
                    'reserve_price_cents' => $item['reserve'] === null ? null : (int) round($item['reserve'] * 100),
                    'buy_now_cents' => $item['buy_now'] === null ? null : (int) round($item['buy_now'] * 100),
                    'anti_snipe_window_sec' => 120,
                    'anti_snipe_extend_sec' => 120,
                    'quantity' => 1,
                ],
            );

            if ($auction->wasRecentlyCreated || $auction->wasChanged('product_id')) {
                $product->update([
                    'reserved_auction' => max((int) $product->reserved_auction, 1),
                ]);
            }
        }
    }
}
