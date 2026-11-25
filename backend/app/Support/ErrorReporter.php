<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Throwable;

class ErrorReporter
{
    public static function capture(Throwable $e, array $context = []): void
    {
        Log::error($e->getMessage(), array_merge($context, [
            'exception' => $e::class,
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]));

        if (function_exists('\\Sentry\\captureException')) {
            \Sentry\captureException($e);
        }
    }
}
