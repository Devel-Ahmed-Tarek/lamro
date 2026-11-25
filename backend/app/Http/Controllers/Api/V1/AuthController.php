<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\NotifyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    public function __construct(private NotifyService $notify) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'account_type' => ['required', Rule::in(['private', 'business'])],
            'phone' => ['nullable', 'string', 'max:40'],
            'company_name' => ['nullable', 'required_if:account_type,business', 'string', 'max:190'],
            'vat_id' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'size:2'],
        ]);

        Role::findOrCreate('customer', 'web');

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'account_type' => $data['account_type'],
            'company_name' => $data['company_name'] ?? null,
            'vat_id' => $data['vat_id'] ?? null,
            'country' => isset($data['country']) ? strtoupper($data['country']) : null,
            'is_active' => true,
            'email_verified_at' => null,
        ]);

        $user->syncRoles(['customer']);
        $this->sendVerification($user);

        $token = $user->createToken('customer')->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => new UserResource($user->load('roles', 'permissions')),
            ],
        ], 201);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->email_verified_at) {
            return response()->json(['data' => ['ok' => true, 'already_verified' => true]]);
        }
        $this->sendVerification($user);

        return response()->json(['data' => ['ok' => true]]);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
        ]);

        $row = DB::table('email_verification_tokens')->where('email', $data['email'])->first();
        if (! $row || ! hash_equals((string) $row->token, hash('sha256', $data['token']))) {
            throw ValidationException::withMessages(['token' => ['Invalid or expired verification token.']]);
        }

        $user = User::query()->where('email', $data['email'])->firstOrFail();
        $user->forceFill(['email_verified_at' => now()])->save();
        DB::table('email_verification_tokens')->where('email', $data['email'])->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    private function sendVerification(User $user): void
    {
        $plain = Str::random(64);
        DB::table('email_verification_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => hash('sha256', $plain), 'created_at' => now()],
        );
        $frontend = explode(',', (string) config('app.frontend_url', config('app.url')))[0];
        $frontend = rtrim($frontend, '/');
        $verifyUrl = $frontend.'/verify-email?email='.urlencode($user->email).'&token='.urlencode($plain);
        $this->notify->send($user, 'email_verify', [
            'name' => $user->name,
            'verify_url' => $verifyUrl,
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        /** @var User|null $user */
        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account is disabled.'],
            ]);
        }

        $isStaff = $user->isStaff();
        $isCustomer = $user->isCustomer();

        if (! $isStaff && ! $isCustomer) {
            throw ValidationException::withMessages([
                'email' => ['This account has no access role.'],
            ]);
        }

        $tokenName = $isStaff ? 'admin' : 'customer';
        $user->tokens()->where('name', $tokenName)->delete();
        $token = $user->createToken($tokenName)->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => new UserResource($user->load('roles', 'permissions')),
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => new UserResource($user->load('roles', 'permissions')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->currentAccessToken()?->delete();

        return response()->json([
            'data' => ['ok' => true],
        ]);
    }
}
