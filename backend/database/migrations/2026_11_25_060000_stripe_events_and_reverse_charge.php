<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stripe_webhook_events')) {
            Schema::create('stripe_webhook_events', function (Blueprint $table) {
                $table->string('event_id')->primary();
                $table->string('type')->nullable();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();
            });
        }

        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'reverse_charge')) {
                $table->boolean('reverse_charge')->default(false)->after('tax_rate_bps');
            }
        });

        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'reverse_charge')) {
                $table->boolean('reverse_charge')->default(false)->after('tax_rate_bps');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_webhook_events');
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'reverse_charge')) {
                $table->dropColumn('reverse_charge');
            }
        });
        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasColumn('invoices', 'reverse_charge')) {
                $table->dropColumn('reverse_charge');
            }
        });
    }
};
