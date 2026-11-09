<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->string('name');
            $table->string('line1');
            $table->string('line2')->nullable();
            $table->string('city');
            $table->string('postcode');
            $table->string('country', 2)->default('DE');
            $table->string('phone')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('shipping_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->json('name');
            $table->unsignedInteger('price_cents')->default(0);
            $table->string('countries')->nullable(); // comma ISO codes, null = all
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('type'); // percent|fixed
            $table->unsignedInteger('value'); // percent points (500=5%) or cents
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('min_subtotal_cents')->default(0);
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('quantity_discount_tiers', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('min_qty');
            $table->unsignedInteger('percent_bps'); // 500 = 5%
            $table->boolean('combine_with_coupon')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('feature_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->boolean('enabled')->default(true);
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('meta')->nullable();
            $table->string('ip')->nullable();
            $table->timestamps();
            $table->index(['subject_type', 'subject_id']);
        });

        Schema::create('cms_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->json('title');
            $table->json('body');
            $table->string('meta_title')->nullable();
            $table->string('meta_description')->nullable();
            $table->string('status')->default('published'); // draft|published
            $table->timestamps();
        });

        Schema::create('cms_banners', function (Blueprint $table) {
            $table->id();
            $table->json('title')->nullable();
            $table->string('image_path')->nullable();
            $table->string('cta_url')->nullable();
            $table->unsignedInteger('sort')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->boolean('enabled')->default(true);
            $table->json('subject');
            $table->json('body');
            $table->timestamps();
        });

        Schema::create('notifications_inbox', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('title');
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('watchlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('auction_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'product_id']);
        });

        Schema::create('order_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('requested'); // requested|approved|rejected|returned|refunded
            $table->string('reason');
            $table->text('message')->nullable();
            $table->text('admin_note')->nullable();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('credit_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('number')->unique();
            $table->unsignedInteger('amount_cents');
            $table->text('reason')->nullable();
            $table->timestamp('issued_at');
            $table->timestamps();
        });

        Schema::create('system_backups', function (Blueprint $table) {
            $table->id();
            $table->string('path');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('discount_cents')->default(0)->after('subtotal_cents');
            $table->unsignedInteger('shipping_cents')->default(0)->after('discount_cents');
            $table->string('coupon_code')->nullable()->after('shipping_cents');
            $table->foreignId('shipping_method_id')->nullable()->after('coupon_code')->constrained('shipping_methods')->nullOnDelete();
            $table->string('tracking_number')->nullable()->after('notes');
            $table->string('guest_email')->nullable()->after('user_id');
            $table->string('guest_name')->nullable()->after('guest_email');
            $table->timestamp('cancelled_at')->nullable()->after('paid_at');
        });

        Schema::table('carts', function (Blueprint $table) {
            $table->string('coupon_code')->nullable()->after('user_id');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->boolean('margin_scheme')->default(false)->after('allow_inquiry');
            $table->string('meta_title')->nullable()->after('margin_scheme');
            $table->string('meta_description')->nullable()->after('meta_title');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('two_factor_enabled')->default(false)->after('is_active');
            $table->text('two_factor_secret')->nullable()->after('two_factor_enabled');
        });

        // Seed defaults
        DB::table('shipping_methods')->insert([
            [
                'code' => 'eu_parcel',
                'name' => json_encode(['de' => 'Paket EU', 'en' => 'EU parcel']),
                'price_cents' => 2400,
                'countries' => null,
                'is_active' => 1,
                'sort' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'pickup',
                'name' => json_encode(['de' => 'Abholung', 'en' => 'Pickup']),
                'price_cents' => 0,
                'countries' => null,
                'is_active' => 1,
                'sort' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $features = [
            'store', 'auctions', 'buy_now', 'make_offer', 'quote', 'inquiry',
            'coupons', 'quantity_discounts', 'seller_registration',
            'payment_bank_transfer', 'payment_stripe', 'payment_paypal',
            'guest_checkout', 'maintenance_mode',
        ];
        foreach ($features as $key) {
            DB::table('feature_settings')->insert([
                'key' => $key,
                'enabled' => $key === 'maintenance_mode' ? 0 : ($key === 'payment_stripe' || $key === 'payment_paypal' || $key === 'seller_registration' ? 0 : 1),
                'meta' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('quantity_discount_tiers')->insert([
            ['min_qty' => 5, 'percent_bps' => 500, 'combine_with_coupon' => 0, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['min_qty' => 10, 'percent_bps' => 1000, 'combine_with_coupon' => 0, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['min_qty' => 20, 'percent_bps' => 1500, 'combine_with_coupon' => 0, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);

        DB::table('coupons')->insert([
            'code' => 'DEMO10',
            'type' => 'percent',
            'value' => 1000,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addYear(),
            'min_subtotal_cents' => 0,
            'max_uses' => null,
            'used_count' => 0,
            'user_id' => null,
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $pages = [
            ['slug' => 'about', 'title' => ['de' => 'Über uns', 'en' => 'About us'], 'body' => ['de' => 'Jala — Industrielle Elektronik.', 'en' => 'Jala — industrial electronics.']],
            ['slug' => 'services', 'title' => ['de' => 'Leistungen', 'en' => 'Services'], 'body' => ['de' => 'Beschaffung, Prüfung, Versand.', 'en' => 'Sourcing, testing, shipping.']],
            ['slug' => 'impressum', 'title' => ['de' => 'Impressum', 'en' => 'Imprint'], 'body' => ['de' => 'Angaben gemäß §5 TMG.', 'en' => 'Legal imprint.']],
            ['slug' => 'privacy', 'title' => ['de' => 'Datenschutz', 'en' => 'Privacy'], 'body' => ['de' => 'Datenschutzerklärung.', 'en' => 'Privacy policy.']],
            ['slug' => 'terms', 'title' => ['de' => 'AGB', 'en' => 'Terms'], 'body' => ['de' => 'Allgemeine Geschäftsbedingungen.', 'en' => 'Terms and conditions.']],
            ['slug' => 'cookies', 'title' => ['de' => 'Cookies', 'en' => 'Cookies'], 'body' => ['de' => 'Cookie-Richtlinie.', 'en' => 'Cookie policy.']],
            ['slug' => 'auction-terms', 'title' => ['de' => 'Auktionsbedingungen', 'en' => 'Auction terms'], 'body' => ['de' => 'Bedingungen für Auktionen.', 'en' => 'Auction terms.']],
        ];
        foreach ($pages as $page) {
            DB::table('cms_pages')->insert([
                'slug' => $page['slug'],
                'title' => json_encode($page['title']),
                'body' => json_encode($page['body']),
                'meta_title' => $page['title']['en'],
                'meta_description' => null,
                'status' => 'published',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $templates = [
            'account_registered' => ['de' => 'Willkommen', 'en' => 'Welcome'],
            'order_created' => ['de' => 'Bestellung erstellt', 'en' => 'Order created'],
            'payment_confirmed' => ['de' => 'Zahlung bestätigt', 'en' => 'Payment confirmed'],
            'invoice_issued' => ['de' => 'Rechnung verfügbar', 'en' => 'Invoice available'],
            'order_shipped' => ['de' => 'Bestellung versendet', 'en' => 'Order shipped'],
            'inquiry_reply' => ['de' => 'Antwort auf Ihre Anfrage', 'en' => 'Reply to your inquiry'],
            'auction_won' => ['de' => 'Auktion gewonnen', 'en' => 'Auction won'],
        ];
        foreach ($templates as $key => $subject) {
            DB::table('notification_templates')->insert([
                'key' => $key,
                'enabled' => 1,
                'subject' => json_encode($subject),
                'body' => json_encode([
                    'de' => 'Benachrichtigung: '.$subject['de'],
                    'en' => 'Notification: '.$subject['en'],
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['two_factor_enabled', 'two_factor_secret']);
        });
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['margin_scheme', 'meta_title', 'meta_description']);
        });
        Schema::table('carts', function (Blueprint $table) {
            $table->dropColumn('coupon_code');
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('shipping_method_id');
            $table->dropColumn([
                'discount_cents', 'shipping_cents', 'coupon_code', 'tracking_number',
                'guest_email', 'guest_name', 'cancelled_at',
            ]);
        });

        Schema::dropIfExists('system_backups');
        Schema::dropIfExists('credit_notes');
        Schema::dropIfExists('order_returns');
        Schema::dropIfExists('watchlists');
        Schema::dropIfExists('notifications_inbox');
        Schema::dropIfExists('notification_templates');
        Schema::dropIfExists('cms_banners');
        Schema::dropIfExists('cms_pages');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('feature_settings');
        Schema::dropIfExists('quantity_discount_tiers');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('shipping_methods');
        Schema::dropIfExists('addresses');
    }
};
