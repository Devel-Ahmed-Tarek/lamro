<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedInteger('refunded_cents')->default(0)->after('amount_cents');
            $table->string('refund_provider_id')->nullable()->after('provider_id');
            $table->timestamp('refunded_at')->nullable()->after('reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['refunded_cents', 'refund_provider_id', 'refunded_at']);
        });
    }
};
