<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('sold_quantity')->default(0)->after('reserved_order');
        });

        Schema::create('tax_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('rate_bps')->default(1900); // 19.00%
            $table->string('currency', 3)->default('EUR');
            $table->string('company_name')->default('Jala');
            $table->string('company_address')->nullable();
            $table->string('vat_id')->nullable();
            $table->string('bank_iban')->nullable();
            $table->string('bank_bic')->nullable();
            $table->string('bank_name')->nullable();
            $table->timestamps();
        });

        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique('user_id');
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();
            $table->unique(['cart_id', 'product_id']);
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('auction_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source')->default('store'); // store|auction
            $table->string('status')->default('pending_payment');
            $table->unsignedInteger('subtotal_cents')->default(0);
            $table->unsignedInteger('tax_cents')->default(0);
            $table->unsignedInteger('total_cents')->default(0);
            $table->unsignedInteger('tax_rate_bps')->default(1900);
            $table->string('currency', 3)->default('EUR');
            $table->string('shipping_name')->nullable();
            $table->string('shipping_line1')->nullable();
            $table->string('shipping_city')->nullable();
            $table->string('shipping_postcode')->nullable();
            $table->string('shipping_country', 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('sku')->nullable();
            $table->string('part_number')->nullable();
            $table->json('name');
            $table->unsignedInteger('unit_price_cents');
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('line_total_cents');
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('method')->default('bank_transfer');
            $table->string('status')->default('pending');
            $table->unsignedInteger('amount_cents');
            $table->string('currency', 3)->default('EUR');
            $table->string('reference')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('number')->unique();
            $table->unsignedInteger('subtotal_cents');
            $table->unsignedInteger('tax_cents');
            $table->unsignedInteger('total_cents');
            $table->unsignedInteger('tax_rate_bps');
            $table->json('snapshot');
            $table->timestamp('issued_at');
            $table->timestamps();
        });

        Schema::create('inquiries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('auction_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type'); // inquiry|offer|quote|contact
            $table->string('status')->default('open'); // open|answered|accepted|rejected|closed
            $table->string('guest_name')->nullable();
            $table->string('guest_email')->nullable();
            $table->unsignedInteger('offer_amount_cents')->nullable();
            $table->unsignedInteger('quantity')->nullable();
            $table->text('message');
            $table->text('admin_reply')->nullable();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();
        });

        Schema::table('auctions', function (Blueprint $table) {
            $table->foreignId('winner_order_id')->nullable()->after('winner_user_id')->constrained('orders')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('auctions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('winner_order_id');
        });
        Schema::dropIfExists('inquiries');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('tax_settings');
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('sold_quantity');
        });
    }
};
