<?php

namespace Database\Seeders;

use App\Models\TaxSetting;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        TaxSetting::current();

        $this->call([
            RolesAndPermissionsSeeder::class,
            CatalogSeeder::class,
            AuctionSeeder::class,
        ]);
    }
}
