<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->databaseOk(),
            'queue' => $this->queueOk(),
            'cache' => $this->cacheOk(),
        ];
        $ok = ! in_array(false, $checks, true);

        return response()->json([
            'data' => [
                'status' => $ok ? 'ok' : 'degraded',
                'service' => 'jala-api',
                'checks' => $checks,
            ],
        ], $ok ? 200 : 503);
    }

    private function databaseOk(): bool
    {
        try {
            DB::select('select 1');

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function queueOk(): bool
    {
        try {
            if (! Schema::hasTable('jobs')) {
                return true;
            }
            DB::table('jobs')->limit(1)->count();

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function cacheOk(): bool
    {
        try {
            $key = 'health:'.uniqid('', true);
            cache()->put($key, 1, 5);

            return cache()->pull($key) === 1;
        } catch (\Throwable) {
            return false;
        }
    }
}
