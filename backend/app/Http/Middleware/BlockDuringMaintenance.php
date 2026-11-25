<?php

namespace App\Http\Middleware;

use App\Models\FeatureSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BlockDuringMaintenance
{
    /** @var list<string> */
    private array $allowExact = [
        'api/v1/health',
        'api/v1/features',
        'api/v1/auth/login',
        'api/v1/auth/logout',
        'api/v1/auth/me',
        'api/v1/payments/stripe/webhook',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (! FeatureSetting::enabled('maintenance_mode', false)) {
            return $next($request);
        }

        $user = $request->user();
        if ($user && ($user->can('admin.system') || $user->can('admin.features'))) {
            return $next($request);
        }

        $path = trim($request->path(), '/');
        foreach ($this->allowExact as $allowed) {
            if ($path === $allowed) {
                return $next($request);
            }
        }

        if (str_starts_with($path, 'api/v1/admin')) {
            return $next($request);
        }

        return response()->json([
            'message' => 'The storefront is in maintenance mode.',
            'maintenance' => true,
        ], 503);
    }
}
