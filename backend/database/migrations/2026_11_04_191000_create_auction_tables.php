<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auctions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->string('type');
            $table->string('status')->default('draft');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('starting_price_cents');
            $table->unsignedInteger('current_price_cents');
            $table->unsignedInteger('increment_cents');
            $table->unsignedInteger('reserve_price_cents')->nullable();
            $table->unsignedInteger('buy_now_cents')->nullable();
            $table->unsignedInteger('anti_snipe_window_sec')->default(120);
            $table->unsignedInteger('anti_snipe_extend_sec')->default(120);
            $table->unsignedInteger('quantity')->default(1);
            $table->unsignedInteger('version')->default(0);
            $table->foreignId('winner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ended_reason')->nullable();
            $table->timestamps();

            $table->index(['status', 'starts_at']);
            $table->index(['status', 'ends_at']);
        });

        Schema::create('auction_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->text('note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['auction_id', 'user_id']);
            $table->index(['status', 'auction_id']);
        });

        Schema::create('bids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('amount_cents');
            $table->boolean('is_proxy')->default(false);
            $table->timestamps();

            $table->index(['auction_id', 'created_at']);
            $table->index(['auction_id', 'amount_cents']);
        });

        Schema::create('auction_proxies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('max_amount_cents');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['auction_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auction_proxies');
        Schema::dropIfExists('bids');
        Schema::dropIfExists('auction_applications');
        Schema::dropIfExists('auctions');
    }
};
