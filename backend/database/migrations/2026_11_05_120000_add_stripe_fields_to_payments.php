<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('provider_id')->nullable()->after('reference');
            $table->string('checkout_url', 1000)->nullable()->after('provider_id');
            $table->string('demo_token')->nullable()->after('checkout_url');
        });

        DB::table('feature_settings')->updateOrInsert(
            ['key' => 'payment_stripe'],
            ['enabled' => 1, 'updated_at' => now(), 'created_at' => now()]
        );
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['provider_id', 'checkout_url', 'demo_token']);
        });
    }
};
