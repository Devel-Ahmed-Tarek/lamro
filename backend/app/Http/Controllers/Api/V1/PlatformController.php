<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\ProductResource;
use App\Models\AuditLog;
use App\Models\CmsBanner;
use App\Models\CmsPage;
use App\Models\Coupon;
use App\Models\CreditNote;
use App\Models\FeatureSetting;
use App\Models\InboxNotification;
use App\Models\Inquiry;
use App\Models\Invoice;
use App\Models\NotificationTemplate;
use App\Models\Order;
use App\Models\OrderReturn;
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

    public function cmsPage(string $slug): JsonResponse
    {
        $page = CmsPage::query()->where('slug', $slug)->where('status', 'published')->firstOrFail();

        return response()->json(['data' => $page]);
    }

    public function cmsBanners(): JsonResponse
    {
        return response()->json([
            'data' => CmsBanner::query()->where('is_active', true)->orderBy('sort')->get(),
        ]);
    }

    public function adminCmsPages(): JsonResponse
    {
        return response()->json(['data' => CmsPage::query()->orderBy('slug')->get()]);
    }

    public function adminCmsPageUpdate(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'array'],
            'body' => ['sometimes', 'array'],
            'meta_title' => ['nullable', 'string'],
            'meta_description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['draft', 'published'])],
        ]);
        $cmsPage->update($data);

        return response()->json(['data' => $cmsPage->fresh()]);
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

    public function adminReports(): JsonResponse
    {
        return response()->json([
            'data' => [
                'orders_total' => Order::query()->count(),
                'orders_paid' => Order::query()->whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])->count(),
                'revenue_cents' => (int) Order::query()->whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])->sum('total_cents'),
                'invoices' => Invoice::query()->count(),
                'open_inquiries' => Inquiry::query()->where('status', 'open')->count(),
                'customers' => User::query()->role('customer')->count(),
                'sales_split' => [
                    'store' => (int) Order::query()->where('source', 'store')->whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])->sum('total_cents'),
                    'auction' => (int) Order::query()->where('source', 'auction')->whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])->sum('total_cents'),
                ],
            ],
        ]);
    }

    public function adminReportsExport(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $orders = Order::query()->with('user')->latest()->limit(500)->get();

        return response()->streamDownload(function () use ($orders) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['number', 'source', 'status', 'total', 'email', 'created_at']);
            foreach ($orders as $order) {
                fputcsv($out, [
                    $order->number,
                    $order->source,
                    $order->status,
                    $order->total,
                    $order->user?->email,
                    $order->created_at,
                ]);
            }
            fclose($out);
        }, 'jala-orders.csv', ['Content-Type' => 'text/csv']);
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

    public function taxSettings(): JsonResponse
    {
        return response()->json(['data' => TaxSetting::current()]);
    }

    public function updateTaxSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rate_bps' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'company_name' => ['sometimes', 'string'],
            'company_address' => ['nullable', 'string'],
            'vat_id' => ['nullable', 'string'],
            'bank_iban' => ['nullable', 'string'],
            'bank_bic' => ['nullable', 'string'],
            'bank_name' => ['nullable', 'string'],
        ]);
        $tax = TaxSetting::current();
        $tax->update($data);
        $this->audit->log($request->user(), 'tax.updated', $tax);

        return response()->json(['data' => $tax->fresh()]);
    }

    public function requestReturn(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->user_id === $request->user()->id, 403);
        if (! in_array($order->status, ['paid', 'processing', 'shipped', 'delivered'], true)) {
            throw ValidationException::withMessages(['order' => ['Return not allowed for this order status.']]);
        }
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:190'],
            'message' => ['nullable', 'string', 'max:5000'],
        ]);
        $ret = OrderReturn::query()->create([
            'order_id' => $order->id,
            'user_id' => $request->user()->id,
            'status' => 'requested',
            'reason' => $data['reason'],
            'message' => $data['message'] ?? null,
        ]);
        $order->update(['status' => 'return_requested']);

        $this->notify->notifyAdmins(
            'admin.return_requested',
            'Return requested',
            $request->user()->name.' requested return for '.$order->number.': '.$data['reason'],
            [
                'order_id' => $order->id,
                'return_id' => $ret->id,
                'order_number' => $order->number,
            ],
            '/admin/returns',
        );

        return response()->json(['data' => $ret], 201);
    }

    public function adminReturns(): JsonResponse
    {
        return response()->json([
            'data' => OrderReturn::query()->with(['order', 'user'])->latest()->limit(100)->get(),
        ]);
    }

    public function adminReturnUpdate(Request $request, OrderReturn $orderReturn): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected', 'returned', 'refunded'])],
            'admin_note' => ['nullable', 'string'],
            'auto_refund' => ['nullable', 'boolean'],
        ]);

        $ret = $this->refunds->processReturn(
            $orderReturn,
            $request->user(),
            $data['status'],
            $data['admin_note'] ?? null,
            $data['auto_refund'] ?? ($data['status'] === 'refunded'),
        );

        return response()->json(['data' => $ret]);
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

    public function myReturns(Request $request): JsonResponse
    {
        $items = OrderReturn::query()
            ->where('user_id', $request->user()->id)
            ->with('order')
            ->latest()
            ->limit(50)
            ->get();

        return response()->json(['data' => $items]);
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

    public function watchlist(Request $request): JsonResponse
    {
        $items = Watchlist::query()->where('user_id', $request->user()->id)->with('product.brand')->latest()->get();

        return response()->json([
            'data' => $items->map(fn (Watchlist $w) => [
                'id' => $w->id,
                'product' => $w->product ? new ProductResource($w->product) : null,
            ]),
        ]);
    }

    public function toggleWatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);
        $existing = Watchlist::query()
            ->where('user_id', $request->user()->id)
            ->where('product_id', $data['product_id'])
            ->first();
        if ($existing) {
            $existing->delete();

            return response()->json(['data' => ['watching' => false]]);
        }
        Watchlist::query()->create([
            'user_id' => $request->user()->id,
            'product_id' => $data['product_id'],
        ]);

        return response()->json(['data' => ['watching' => true]]);
    }

    public function systemStatus(): JsonResponse
    {
        $last = SystemBackup::query()->latest()->first();

        return response()->json([
            'data' => [
                'app' => config('app.name'),
                'maintenance' => FeatureSetting::enabled('maintenance_mode', false),
                'last_backup' => $last?->created_at?->toIso8601String(),
                'last_backup_path' => $last?->path,
                'queue' => 'database',
                'orders_pending_payment' => Order::query()->where('status', 'pending_payment')->count(),
            ],
        ]);
    }

    public function runBackup(Request $request): JsonResponse
    {
        $dir = storage_path('app/backups');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $name = 'backup-'.now()->format('Ymd-His').'.sql';
        $path = $dir.'/'.$name;
        // SQLite copy or mysqldump-lite: copy database file when sqlite
        $connection = config('database.default');
        if ($connection === 'sqlite') {
            $db = config('database.connections.sqlite.database');
            copy($db, $path);
        } else {
            file_put_contents($path, '-- backup placeholder '.now()->toIso8601String()."\n");
            Artisan::call('db:show');
        }
        $backup = SystemBackup::query()->create([
            'path' => 'backups/'.$name,
            'size_bytes' => filesize($path) ?: 0,
            'created_by' => $request->user()->id,
            'note' => 'manual',
        ]);
        $this->audit->log($request->user(), 'system.backup', $backup);

        return response()->json(['data' => $backup], 201);
    }

    public function listBackups(): JsonResponse
    {
        return response()->json(['data' => SystemBackup::query()->latest()->limit(50)->get()]);
    }

    public function sitemap(): \Illuminate\Http\Response
    {
        $base = rtrim(config('app.frontend_url', config('app.url')), '/');
        $urls = ['/', '/store', '/auctions', '/about', '/services', '/contact'];
        foreach (CmsPage::query()->where('status', 'published')->pluck('slug') as $slug) {
            $urls[] = '/legal/'.$slug;
        }
        $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach ($urls as $url) {
            $xml .= '<url><loc>'.htmlspecialchars($base.$url, ENT_XML1).'</loc></url>';
        }
        $xml .= '</urlset>';

        return response($xml, 200, ['Content-Type' => 'application/xml']);
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
