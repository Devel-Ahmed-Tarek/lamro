<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('stripe_settings')) {
            return;
        }

        Schema::create('stripe_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(false);
            $table->boolean('demo_mode')->default(true);
            $table->text('publishable_key')->nullable();
            $table->text('secret_key')->nullable();
            $table->text('webhook_secret')->nullable();
            $table->json('payment_method_types')->nullable();
            $table->string('statement_descriptor', 22)->nullable();
            $table->string('capture_method', 20)->default('automatic');
            $table->string('billing_address_collection', 20)->default('auto');
            $table->boolean('phone_number_collection')->default(false);
            $table->boolean('allow_promotion_codes')->default(false);
            $table->boolean('tax_id_collection')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_settings');
    }
};
