<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && ! $user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => ['Please verify your email before continuing.'],
            ]);
        }

        return $next($request);
    }
}
