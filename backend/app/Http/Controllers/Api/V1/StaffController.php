<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    public function index(): JsonResponse
    {
        $staff = User::query()
            ->role(['super_admin', 'ops', 'catalog', 'support'])
            ->with('roles', 'permissions')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => UserResource::collection($staff),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:4'],
            'role' => ['required', Rule::in(['ops', 'catalog', 'support', 'super_admin'])],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? null,
            'is_active' => true,
        ]);

        $user->syncRoles([$data['role']]);

        return response()->json([
            'data' => new UserResource($user->load('roles', 'permissions')),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:40'],
            'role' => ['sometimes', Rule::in(['ops', 'catalog', 'support', 'super_admin'])],
            'is_active' => ['sometimes', 'boolean'],
            'password' => ['nullable', 'string', 'min:4'],
        ]);

        if (array_key_exists('password', $data) && filled($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $role = $data['role'] ?? null;
        unset($data['role']);

        $user->update($data);

        if ($role) {
            $user->syncRoles([$role]);
        }

        return response()->json([
            'data' => new UserResource($user->fresh()->load('roles', 'permissions')),
        ]);
    }
}
