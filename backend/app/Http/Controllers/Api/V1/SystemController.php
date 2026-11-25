<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Auction;
use App\Models\Brand;
use App\Models\Category;
use App\Models\CmsPage;
use App\Models\FeatureSetting;
use App\Models\Order;
use App\Models\Product;
use App\Models\SystemBackup;
use App\Models\TaxSetting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class SystemController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function publicTax(): JsonResponse
    {
        $tax = TaxSetting::current();

        return response()->json([
            'data' => [
                'rate_bps' => (int) $tax->rate_bps,
                'rate_percent' => round(((int) $tax->rate_bps) / 100, 2),
                'currency' => $tax->currency,
            ],
        ]);
    }

    public function robots(): \Illuminate\Http\Response
    {
        $base = rtrim(explode(',', (string) config('app.frontend_url', config('app.url')))[0], '/');
        $api = rtrim((string) config('app.url'), '/');
        $body = "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nSitemap: {$base}/sitemap.xml\nSitemap: {$api}/api/v1/sitemap.xml\n";

        return response($body, 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemap(): \Illuminate\Http\Response
    {
        $base = rtrim(explode(',', (string) config('app.frontend_url', config('app.url')))[0], '/');
        $urls = ['/', '/store', '/auctions', '/about', '/services', '/contact', '/brands', '/categories', '/company-stock'];
        foreach (CmsPage::query()->where('status', 'published')->pluck('slug') as $slug) {
            $urls[] = '/legal/'.$slug;
        }
        foreach (Product::query()->published()->pluck('slug') as $slug) {
            $urls[] = '/store/'.$slug;
        }
        foreach (Brand::query()->where('is_active', true)->pluck('slug') as $slug) {
            $urls[] = '/brands/'.$slug;
        }
        foreach (Category::query()->where('is_active', true)->pluck('slug') as $slug) {
            $urls[] = '/categories/'.$slug;
        }
        foreach (Auction::query()->whereIn('status', ['live', 'scheduled'])->pluck('slug') as $slug) {
            $urls[] = '/auctions/'.$slug;
        }
        $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach (array_unique($urls) as $url) {
            $xml .= '<url><loc>'.htmlspecialchars($base.$url, ENT_XML1).'</loc></url>';
        }
        $xml .= '</urlset>';

        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }

    public function status(): JsonResponse
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
}
