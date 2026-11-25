<?php

namespace App\Http\Middleware;

use App\Models\FeatureSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFeatureEnabled
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        if (! FeatureSetting::enabled($feature, true)) {
            return response()->json([
                'message' => 'This feature is currently disabled.',
                'feature' => $feature,
            ], 503);
        }

        return $next($request);
    }
}
