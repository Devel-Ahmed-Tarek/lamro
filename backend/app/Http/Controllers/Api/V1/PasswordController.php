<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\NotifyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordController extends Controller
{
    public function __construct(private NotifyService $notify) {}

    public function forgot(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $user = User::query()->where('email', $data['email'])->first();
        if ($user) {
            $token = Str::random(64);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($token), 'created_at' => now()],
            );
            $frontend = rtrim(explode(',', (string) config('app.frontend_url', config('app.url')))[0], '/');
            $resetUrl = $frontend.'/reset-password?email='.urlencode($user->email).'&token='.urlencode($token);
            $this->notify->send($user, 'password_reset', [
                'name' => $user->name,
                'reset_token' => $token,
                'reset_url' => $resetUrl,
            ]);
            if (config('app.debug')) {
                logger()->info('password.reset_token', ['email' => $user->email, 'reset_url' => $resetUrl]);
            }
        }

        return response()->json(['data' => ['ok' => true, 'message' => 'If the email exists, a reset link was sent.']]);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $row = DB::table('password_reset_tokens')->where('email', $data['email'])->first();
        if (! $row || ! Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages(['token' => ['Invalid or expired reset token.']]);
        }

        if ($row->created_at && now()->diffInMinutes($row->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
            throw ValidationException::withMessages(['token' => ['Invalid or expired reset token.']]);
        }

        $user = User::query()->where('email', $data['email'])->firstOrFail();
        $user->update(['password' => $data['password']]);
        $user->tokens()->delete();
        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function change(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['Current password is incorrect.']]);
        }
        $user->update(['password' => $data['password']]);
        $user->tokens()->delete();

        return response()->json(['data' => ['ok' => true, 'reauth_required' => true]]);
    }
}
