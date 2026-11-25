<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\ProductResource;
use App\Models\Auction;
use App\Models\AuctionApplication;
use App\Models\AuditLog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\CmsBanner;
use App\Models\CmsPage;
use App\Models\CompanyStockListing;
use App\Models\Coupon;
use App\Models\CreditNote;
use App\Models\FeatureSetting;
use App\Models\InboxNotification;
use App\Models\Inquiry;
use App\Models\Invoice;
use App\Models\NotificationTemplate;
use App\Models\Order;
use App\Models\OrderReturn;
use App\Models\Product;
use App\Models\QuantityDiscountTier;
use App\Models\ShippingMethod;
use App\Models\SystemBackup;
use App\Models\TaxSetting;
use App\Models\User;
use App\Models\Watchlist;
use App\Services\AuditLogger;
use App\Services\CheckoutService;
use App\Services\NotifyService;
use App\Services\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PlatformController extends Controller
{
    public function __construct(
        private AuditLogger $audit,
        private CheckoutService $checkout,
        private NotifyService $notify,
        private RefundService $refunds,
    ) {}

    public function features(): JsonResponse
    {
        return response()->json([
            'data' => FeatureSetting::query()->orderBy('key')->get()->mapWithKeys(
                fn (FeatureSetting $f) => [$f->key => $f->enabled]
            ),
        ]);
    }

    public function adminFeatures(): JsonResponse
    {
        return response()->json(['data' => FeatureSetting::query()->orderBy('key')->get()]);
    }

    public function updateFeature(Request $request, string $key): JsonResponse
    {
        $data = $request->validate(['enabled' => ['required', 'boolean']]);
        $feature = FeatureSetting::query()->firstOrCreate(['key' => $key], ['enabled' => true]);
        $feature->update(['enabled' => $data['enabled']]);
        FeatureSetting::flushCache();
        if ($key === 'payment_stripe') {
            $stripe = \App\Models\StripeSetting::current();
            $stripe->update(['enabled' => (bool) $data['enabled']]);
            \App\Models\StripeSetting::flushCache();
        }
        $this->audit->log($request->user(), 'feature.updated', $feature, $data);

        return response()->json(['data' => $feature->fresh()]);
    }

    public function shippingMethods(): JsonResponse
    {
        return response()->json([
            'data' => ShippingMethod::query()->where('is_active', true)->orderBy('sort')->get(),
        ]);
    }

    public function adminShippingIndex(): JsonResponse
    {
        return response()->json(['data' => ShippingMethod::query()->orderBy('sort')->get()]);
    }

    public function adminShippingStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:40', 'unique:shipping_methods,code'],
            'name' => ['required', 'array'],
            'price' => ['required', 'numeric', 'min:0'],
            'countries' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'sort' => ['integer'],
        ]);
        $method = ShippingMethod::query()->create([
            'code' => $data['code'],
            'name' => $data['name'],
            'price_cents' => (int) round($data['price'] * 100),
            'countries' => $data['countries'] ?? null,
            'is_active' => $data['is_active'] ?? true,
            'sort' => $data['sort'] ?? 0,
        ]);

        return response()->json(['data' => $method], 201);
    }

    public function adminShippingUpdate(Request $request, ShippingMethod $shippingMethod): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'array'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'countries' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'sort' => ['integer'],
        ]);
        if (isset($data['price'])) {
            $data['price_cents'] = (int) round($data['price'] * 100);
            unset($data['price']);
        }
        $shippingMethod->update($data);

        return response()->json(['data' => $shippingMethod->fresh()]);
    }

    public function adminCoupons(): JsonResponse
    {
        return response()->json(['data' => Coupon::query()->latest()->get()]);
    }

    public function adminCouponStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:40', 'unique:coupons,code'],
            'type' => ['required', Rule::in(['percent', 'fixed'])],
            'value' => ['required', 'numeric', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'min_subtotal' => ['nullable', 'numeric', 'min:0'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'is_active' => ['boolean'],
        ]);
        $coupon = Coupon::query()->create([
            'code' => strtoupper($data['code']),
            'type' => $data['type'],
            'value' => $data['type'] === 'percent' ? (int) round($data['value'] * 100) : (int) round($data['value'] * 100),
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
            'min_subtotal_cents' => isset($data['min_subtotal']) ? (int) round($data['min_subtotal'] * 100) : 0,
            'max_uses' => $data['max_uses'] ?? null,
            'user_id' => $data['user_id'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $coupon], 201);
    }

    public function adminCouponUpdate(Request $request, Coupon $coupon): JsonResponse
    {
        $data = $request->validate([
            'is_active' => ['boolean'],
            'ends_at' => ['nullable', 'date'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
        ]);
        $coupon->update($data);

        return response()->json(['data' => $coupon->fresh()]);
    }

    public function adminQtyDiscounts(): JsonResponse
    {
        return response()->json(['data' => QuantityDiscountTier::query()->orderBy('min_qty')->get()]);
    }

    public function adminQtyDiscountStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'min_qty' => ['required', 'integer', 'min:1'],
            'percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'combine_with_coupon' => ['boolean'],
            'is_active' => ['boolean'],
        ]);
        $tier = QuantityDiscountTier::query()->create([
            'min_qty' => $data['min_qty'],
            'percent_bps' => (int) round($data['percent'] * 100),
            'combine_with_coupon' => $data['combine_with_coupon'] ?? false,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $tier], 201);
    }





    public function adminCustomers(Request $request): JsonResponse
    {
        $query = User::query()->role('customer')->latest();
        if ($q = trim((string) $request->query('q', ''))) {
            $like = '%'.mb_strtolower($q).'%';
            $query->where(function ($builder) use ($like) {
                $builder->whereRaw('LOWER(email) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(company_name) LIKE ?', [$like]);
            });
        }
        $users = $query->paginate(min(100, max(1, (int) $request->query('per_page', 40))));

        return response()->json([
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function adminCustomerToggle(Request $request, User $user): JsonResponse
    {
        abort_unless($user->isCustomer(), 404);
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $user->update(['is_active' => $data['is_active']]);
        $this->audit->log($request->user(), $data['is_active'] ? 'customer.reinstate' : 'customer.suspend', $user);

        return response()->json(['data' => $user->fresh()]);
    }

    public function adminAudit(Request $request): JsonResponse
    {
        $logs = AuditLog::query()->with('user')->latest()->paginate(min(100, max(1, (int) $request->query('per_page', 50))));

        return response()->json([
            'data' => $logs->items(),
            'meta' => ['total' => $logs->total(), 'current_page' => $logs->currentPage(), 'last_page' => $logs->lastPage()],
        ]);
    }

    public function adminOverview(): JsonResponse
    {
        $paidStatuses = ['paid', 'processing', 'shipped', 'delivered'];
        $openOrderStatuses = ['pending_payment', 'paid', 'processing', 'return_requested'];

        $activity = AuditLog::query()
            ->with('user:id,name,email')
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'href' => $this->overviewHrefForAction($log->action),
                'actor' => $log->user?->name ?: $log->user?->email,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => [
                'products' => Product::query()->count(),
                'live_auctions' => Auction::query()->where('status', 'live')->count(),
                'company_stock_pending' => CompanyStockListing::query()->whereIn('status', ['new', 'contacted'])->count(),
                'auction_applications_pending' => AuctionApplication::query()->where('status', 'pending')->count(),
                'open_orders' => Order::query()->whereIn('status', $openOrderStatuses)->count(),
                'customers' => User::query()->role('customer')->count(),
                'open_inquiries' => Inquiry::query()->where('status', 'open')->count(),
                'revenue_cents' => (int) Order::query()->whereIn('status', $paidStatuses)->sum('total_cents'),
                'store_revenue_cents' => (int) Order::query()->where('source', 'store')->whereIn('status', $paidStatuses)->sum('total_cents'),
                'auction_revenue_cents' => (int) Order::query()->where('source', 'auction')->whereIn('status', $paidStatuses)->sum('total_cents'),
                'activity' => $activity,
            ],
        ]);
    }

    private function overviewHrefForAction(string $action): string
    {
        return match (true) {
            str_starts_with($action, 'order.'), str_starts_with($action, 'return.') => '/admin/orders',
            str_starts_with($action, 'payment.') => '/admin/payments',
            str_starts_with($action, 'customer.') => '/admin/customers',
            str_starts_with($action, 'feature.') => '/admin/features',
            str_starts_with($action, 'auction.') => '/admin/auctions',
            str_starts_with($action, 'credit_note.') => '/admin/invoices',
            str_starts_with($action, 'system.') => '/admin/system',
            default => '/admin/audit',
        };
    }



    public function adminNotifications(): JsonResponse
    {
        return response()->json(['data' => NotificationTemplate::query()->orderBy('key')->get()]);
    }

    public function adminNotificationUpdate(Request $request, NotificationTemplate $notificationTemplate): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['boolean'],
            'subject' => ['sometimes', 'array'],
            'body' => ['sometimes', 'array'],
        ]);
        $notificationTemplate->update($data);

        return response()->json(['data' => $notificationTemplate->fresh()]);
    }

    public function myNotifications(Request $request): JsonResponse
    {
        $items = InboxNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(100)
            ->get();

        $unread = InboxNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['data' => $items, 'meta' => ['unread' => $unread]]);
    }

    public function markNotificationRead(Request $request, InboxNotification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);
        $notification->update(['read_at' => now()]);

        return response()->json(['data' => $notification->fresh()]);
    }

    public function markAllNotificationsRead(Request $request): JsonResponse
    {
        InboxNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['data' => ['ok' => true]]);
    }






    public function refundOrder(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string', 'max:500'],
            'restock' => ['nullable', 'boolean'],
        ]);

        $amountCents = isset($data['amount']) ? (int) round($data['amount'] * 100) : null;
        $result = $this->refunds->refundOrder(
            $order,
            $request->user(),
            $amountCents,
            $data['reason'] ?? null,
            $data['restock'] ?? true,
        );

        return response()->json([
            'data' => [
                'order' => new OrderResource($result['order']),
                'credit_note' => $result['credit_note'],
                'payment' => new PaymentResource($result['payment']),
            ],
        ]);
    }


    public function addTracking(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'tracking_number' => ['required', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['processing', 'shipped', 'delivered'])],
        ]);
        $order->update([
            'tracking_number' => $data['tracking_number'],
            'status' => $data['status'] ?? 'shipped',
        ]);
        if ($order->user) {
            $this->notify->send($order->user, 'order_shipped', [
                'number' => $order->number,
                'tracking' => $data['tracking_number'],
            ]);
        }
        $this->audit->log($request->user(), 'order.tracking', $order, $data);

        return response()->json(['data' => new OrderResource($order->fresh()->load(['items', 'payment', 'invoice', 'user']))]);
    }

    public function issueCreditNote(Request $request, Invoice $invoice): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string'],
        ]);
        $note = CreditNote::query()->create([
            'invoice_id' => $invoice->id,
            'order_id' => $invoice->order_id,
            'number' => 'CN-'.now()->format('Y').'-'.Str::upper(Str::random(5)),
            'amount_cents' => (int) round($data['amount'] * 100),
            'reason' => $data['reason'] ?? null,
            'issued_at' => now(),
        ]);
        $this->audit->log($request->user(), 'credit_note.issued', $note);

        return response()->json(['data' => $note], 201);
    }








    public function contact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email'],
            'subject' => ['nullable', 'string', 'max:190'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $inquiry = Inquiry::query()->create([
            'user_id' => $request->user() ? $request->user()->id : \Illuminate\Support\Facades\Auth::guard('sanctum')->id(),
            'type' => 'contact',
            'status' => 'open',
            'guest_name' => $data['name'],
            'guest_email' => $data['email'],
            'message' => ($data['subject'] ? '['.$data['subject'].'] ' : '').$data['message'],
        ]);

        return response()->json(['data' => ['id' => $inquiry->id]], 201);
    }

    public function twoFactorToggle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'password' => ['required', 'string'],
        ]);
        $user = $request->user();
        if (! \Illuminate\Support\Facades\Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['password' => ['Password incorrect.']]);
        }
        $secret = $data['enabled'] ? Str::upper(Str::random(16)) : null;
        $user->update([
            'two_factor_enabled' => $data['enabled'],
            'two_factor_secret' => $secret,
        ]);

        return response()->json([
            'data' => [
                'two_factor_enabled' => $user->two_factor_enabled,
                'secret' => $secret, // demo secret for local confirmation
            ],
        ]);
    }
}
