<?php

use App\Http\Controllers\Api\V1\AddressController;
use App\Http\Controllers\Api\V1\AuctionController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\InquiryController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PasswordController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PlatformController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\StaffController;
use App\Http\Controllers\Api\V1\StripeController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class);
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [PasswordController::class, 'forgot']);
    Route::post('/auth/reset-password', [PasswordController::class, 'reset']);

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/brands', [BrandController::class, 'index']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slug}', [ProductController::class, 'show']);
    Route::get('/auctions', [AuctionController::class, 'index']);
    Route::get('/auctions/{slug}', [AuctionController::class, 'show']);
    Route::post('/inquiries', [InquiryController::class, 'store']);
    Route::post('/contact', [PlatformController::class, 'contact']);
    Route::get('/features', [PlatformController::class, 'features']);
    Route::get('/payments/stripe/config', [StripeController::class, 'config']);
    Route::post('/payments/stripe/webhook', [StripeController::class, 'webhook']);
    Route::get('/shipping-methods', [PlatformController::class, 'shippingMethods']);
    Route::get('/cms/pages/{slug}', [PlatformController::class, 'cmsPage']);
    Route::get('/cms/banners', [PlatformController::class, 'cmsBanners']);
    Route::get('/sitemap.xml', [PlatformController::class, 'sitemap']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/change-password', [PasswordController::class, 'change']);
        Route::post('/auth/two-factor', [PlatformController::class, 'twoFactorToggle']);

        Route::get('/addresses', [AddressController::class, 'index']);
        Route::post('/addresses', [AddressController::class, 'store']);
        Route::put('/addresses/{address}', [AddressController::class, 'update']);
        Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);

        Route::post('/auctions/{auction}/apply', [AuctionController::class, 'apply']);
        Route::post('/auctions/{auction}/bids', [AuctionController::class, 'placeBid']);
        Route::put('/auctions/{auction}/proxy', [AuctionController::class, 'setProxy']);
        Route::delete('/auctions/{auction}/proxy', [AuctionController::class, 'cancelProxy']);
        Route::post('/auctions/{auction}/buy-now', [AuctionController::class, 'buyNow']);
        Route::get('/me/auction-applications', [AuctionController::class, 'myApplications']);
        Route::get('/me/bids', [AuctionController::class, 'myBids']);
        Route::get('/me/won-auctions', [OrderController::class, 'wonAuctions']);
        Route::get('/me/notifications', [PlatformController::class, 'myNotifications']);
        Route::post('/me/notifications/{notification}/read', [PlatformController::class, 'markNotificationRead']);
        Route::post('/me/notifications/read-all', [PlatformController::class, 'markAllNotificationsRead']);
        Route::get('/me/watchlist', [PlatformController::class, 'watchlist']);
        Route::post('/me/watchlist/toggle', [PlatformController::class, 'toggleWatch']);

        Route::get('/cart', [CartController::class, 'show']);
        Route::put('/cart/items', [CartController::class, 'upsert']);
        Route::post('/cart/sync', [CartController::class, 'sync']);
        Route::post('/cart/coupon', [CartController::class, 'coupon']);
        Route::delete('/cart', [CartController::class, 'clear']);

        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/{order}', [OrderController::class, 'show']);
        Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);
        Route::post('/orders/{order}/returns', [PlatformController::class, 'requestReturn']);
        Route::get('/me/returns', [PlatformController::class, 'myReturns']);
        Route::post('/checkout', [OrderController::class, 'checkout']);
        Route::post('/auctions/{auction}/checkout', [OrderController::class, 'checkoutAuction']);
        Route::post('/orders/{order}/stripe/checkout', [StripeController::class, 'start']);
        Route::post('/payments/{payment}/stripe/demo-complete', [StripeController::class, 'demoComplete']);
        Route::post('/payments/stripe/sync', [StripeController::class, 'syncSession']);

        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::get('/invoices/{invoice}/download', [InvoiceController::class, 'download']);

        Route::get('/me/inquiries', [InquiryController::class, 'mine']);

        Route::middleware('permission:admin.profile')->group(function () {
            Route::put('/profile', [ProfileController::class, 'update']);
            Route::post('/profile/avatar', [ProfileController::class, 'avatar']);
            Route::delete('/profile/avatar', [ProfileController::class, 'removeAvatar']);
        });

        Route::middleware('permission:admin.staff')->prefix('admin')->group(function () {
            Route::get('/staff', [StaffController::class, 'index']);
            Route::post('/staff', [StaffController::class, 'store']);
            Route::put('/staff/{user}', [StaffController::class, 'update']);
            Route::get('/roles', [RoleController::class, 'index']);
            Route::put('/roles/{role}', [RoleController::class, 'update']);
        });

        Route::prefix('admin')->group(function () {
            Route::middleware('permission:admin.categories')->group(function () {
                Route::get('/categories', [CategoryController::class, 'index']);
                Route::post('/categories', [CategoryController::class, 'store']);
                Route::put('/categories/{category}', [CategoryController::class, 'update']);
                Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
            });

            Route::middleware('permission:admin.brands')->group(function () {
                Route::get('/brands', [BrandController::class, 'index']);
                Route::post('/brands', [BrandController::class, 'store']);
                Route::put('/brands/{brand}', [BrandController::class, 'update']);
                Route::delete('/brands/{brand}', [BrandController::class, 'destroy']);
            });

            Route::middleware('permission:admin.products')->group(function () {
                Route::get('/products', [ProductController::class, 'index']);
                Route::post('/products', [ProductController::class, 'store']);
                Route::get('/products/{product}', [ProductController::class, 'adminShow']);
                Route::put('/products/{product}', [ProductController::class, 'update']);
                Route::delete('/products/{product}', [ProductController::class, 'destroy']);
                Route::post('/products/{product}/publish', [ProductController::class, 'publish']);
                Route::post('/products/{product}/unpublish', [ProductController::class, 'unpublish']);
                Route::post('/products/{product}/archive', [ProductController::class, 'archive']);
                Route::post('/products/{product}/media', [ProductController::class, 'storeMedia']);
                Route::delete('/products/{product}/media/{media}', [ProductController::class, 'destroyMedia']);
            });

            Route::middleware('permission:admin.inventory')->group(function () {
                Route::get('/inventory', [InventoryController::class, 'index']);
                Route::put('/inventory/{product}', [InventoryController::class, 'adjust']);
            });

            Route::middleware('permission:admin.auctions')->group(function () {
                Route::get('/auctions', [AuctionController::class, 'index']);
                Route::post('/auctions', [AuctionController::class, 'store']);
                Route::get('/auctions/{auction}', [AuctionController::class, 'adminShow']);
                Route::put('/auctions/{auction}', [AuctionController::class, 'update']);
                Route::post('/auctions/{auction}/live', [AuctionController::class, 'goLive']);
                Route::post('/auctions/{auction}/end', [AuctionController::class, 'end']);
                Route::post('/auctions/{auction}/cancel', [AuctionController::class, 'cancel']);
                Route::get('/auction-applications', [AuctionController::class, 'applications']);
                Route::post('/auction-applications/{application}/approve', [AuctionController::class, 'approveApplication']);
                Route::post('/auction-applications/{application}/reject', [AuctionController::class, 'rejectApplication']);
            });

            Route::middleware('permission:admin.orders')->group(function () {
                Route::get('/orders', [OrderController::class, 'adminIndex']);
                Route::get('/orders/{order}', [OrderController::class, 'adminShow']);
                Route::put('/orders/{order}/status', [OrderController::class, 'adminUpdateStatus']);
                Route::post('/orders/{order}/tracking', [PlatformController::class, 'addTracking']);
                Route::post('/orders/{order}/refund', [PlatformController::class, 'refundOrder']);
                Route::get('/returns', [PlatformController::class, 'adminReturns']);
                Route::post('/returns/{orderReturn}/status', [PlatformController::class, 'adminReturnUpdate']);
            });

            Route::middleware('permission:admin.payments')->group(function () {
                Route::get('/payments', [PaymentController::class, 'adminIndex']);
                Route::post('/payments/{payment}/mark-received', [PaymentController::class, 'markReceived']);
                Route::post('/payments/{payment}/mark-failed', [PaymentController::class, 'markFailed']);
            });

            Route::middleware('permission:admin.invoices')->group(function () {
                Route::get('/invoices', [InvoiceController::class, 'adminIndex']);
                Route::post('/invoices/{invoice}/credit-notes', [PlatformController::class, 'issueCreditNote']);
                Route::get('/tax-settings', [PlatformController::class, 'taxSettings']);
                Route::put('/tax-settings', [PlatformController::class, 'updateTaxSettings']);
            });

            Route::middleware('permission:admin.messages')->group(function () {
                Route::get('/inquiries', [InquiryController::class, 'adminIndex']);
                Route::post('/inquiries/{inquiry}/reply', [InquiryController::class, 'adminReply']);
                Route::put('/inquiries/{inquiry}/status', [InquiryController::class, 'adminUpdateStatus']);
            });

            Route::middleware('permission:admin.customers')->group(function () {
                Route::get('/customers', [PlatformController::class, 'adminCustomers']);
                Route::put('/customers/{user}/active', [PlatformController::class, 'adminCustomerToggle']);
            });

            Route::middleware('permission:admin.cms')->group(function () {
                Route::get('/cms/pages', [PlatformController::class, 'adminCmsPages']);
                Route::put('/cms/pages/{cmsPage}', [PlatformController::class, 'adminCmsPageUpdate']);
            });

            Route::middleware('permission:admin.features')->group(function () {
                Route::get('/features', [PlatformController::class, 'adminFeatures']);
                Route::put('/features/{key}', [PlatformController::class, 'updateFeature']);
                Route::get('/coupons', [PlatformController::class, 'adminCoupons']);
                Route::post('/coupons', [PlatformController::class, 'adminCouponStore']);
                Route::put('/coupons/{coupon}', [PlatformController::class, 'adminCouponUpdate']);
                Route::get('/quantity-discounts', [PlatformController::class, 'adminQtyDiscounts']);
                Route::post('/quantity-discounts', [PlatformController::class, 'adminQtyDiscountStore']);
            });

            Route::middleware('permission:admin.shipping')->group(function () {
                Route::get('/shipping-methods', [PlatformController::class, 'adminShippingIndex']);
                Route::post('/shipping-methods', [PlatformController::class, 'adminShippingStore']);
                Route::put('/shipping-methods/{shippingMethod}', [PlatformController::class, 'adminShippingUpdate']);
            });

            Route::middleware('permission:admin.reports')->group(function () {
                Route::get('/reports', [PlatformController::class, 'adminReports']);
                Route::get('/reports/export', [PlatformController::class, 'adminReportsExport']);
            });

            Route::middleware('permission:admin.audit')->group(function () {
                Route::get('/audit', [PlatformController::class, 'adminAudit']);
            });

            Route::middleware('permission:admin.notifications')->group(function () {
                Route::get('/notification-templates', [PlatformController::class, 'adminNotifications']);
                Route::put('/notification-templates/{notificationTemplate}', [PlatformController::class, 'adminNotificationUpdate']);
            });

            Route::middleware('permission:admin.system')->group(function () {
                Route::get('/system/status', [PlatformController::class, 'systemStatus']);
                Route::get('/system/backups', [PlatformController::class, 'listBackups']);
                Route::post('/system/backups', [PlatformController::class, 'runBackup']);
            });
        });
    });
});
