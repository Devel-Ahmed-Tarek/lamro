<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->json('name');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained()->nullOnDelete();
            $table->string('slug')->unique();
            $table->json('name');
            $table->json('summary')->nullable();
            $table->json('notes')->nullable();
            $table->string('part_number')->nullable();
            $table->string('model')->nullable();
            $table->string('sku')->nullable()->unique();
            $table->string('serial')->nullable();
            $table->string('condition')->nullable();
            $table->string('testing')->nullable();
            $table->unsignedInteger('price_cents')->default(0);
            $table->unsignedInteger('total_stock')->default(0);
            $table->unsignedInteger('reserved_auction')->default(0);
            $table->unsignedInteger('reserved_order')->default(0);
            $table->string('weight')->nullable();
            $table->string('dimensions')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('allow_cart')->default(true);
            $table->boolean('allow_buy_now')->default(true);
            $table->boolean('allow_offer')->default(true);
            $table->boolean('allow_quote')->default(true);
            $table->boolean('allow_inquiry')->default(true);
            $table->timestamps();
        });

        Schema::create('product_specs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->json('label');
            $table->string('value');
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('product_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('path');
            $table->string('original_name')->nullable();
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_media');
        Schema::dropIfExists('product_specs');
        Schema::dropIfExists('products');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('categories');
    }
};
