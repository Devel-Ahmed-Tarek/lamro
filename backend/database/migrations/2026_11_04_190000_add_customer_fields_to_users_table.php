<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('account_type')->nullable()->after('email');
            $table->string('company_name')->nullable()->after('account_type');
            $table->string('vat_id')->nullable()->after('company_name');
            $table->string('country', 2)->nullable()->after('vat_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['account_type', 'company_name', 'vat_id', 'country']);
        });
    }
};
