<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications_inbox', function (Blueprint $table) {
            $table->json('meta')->nullable()->after('body');
            $table->string('href')->nullable()->after('meta');
        });
    }

    public function down(): void
    {
        Schema::table('notifications_inbox', function (Blueprint $table) {
            $table->dropColumn(['meta', 'href']);
        });
    }
};
