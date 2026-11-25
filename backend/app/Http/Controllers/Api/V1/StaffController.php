<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class StaffController extends Controller
{
    public function index(): JsonResponse
    {
        $adminRoles = $this->adminRoleNames();

        $staff = User::query()
            ->role($adminRoles)
            ->with('roles', 'permissions')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => UserResource::collection($staff),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $adminRoles = $this->adminRoleNames();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:4'],
            'role' => ['required', 'string', Rule::in($adminRoles)],
            'phone' => ['nullable', 'string', 'max:40'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? null,
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
        ]);

        $user->syncRoles([$data['role']]);

        return response()->json([
            'data' => new UserResource($user->load('roles', 'permissions')),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->assertStaffMember($user);
        $adminRoles = $this->adminRoleNames();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:40'],
            'role' => ['sometimes', 'string', Rule::in($adminRoles)],
            'is_active' => ['sometimes', 'boolean'],
            'password' => ['nullable', 'string', 'min:4'],
        ]);

        if ($user->id === $request->user()?->id && array_key_exists('is_active', $data) && ! $data['is_active']) {
            throw ValidationException::withMessages([
                'is_active' => ['You cannot deactivate your own account.'],
            ]);
        }

        if (
            $user->hasRole('super_admin')
            && array_key_exists('role', $data)
            && $data['role'] !== 'super_admin'
            && $this->superAdminCount() <= 1
        ) {
            throw ValidationException::withMessages([
                'role' => ['At least one Super Admin is required.'],
            ]);
        }

        if (
            $user->hasRole('super_admin')
            && array_key_exists('is_active', $data)
            && ! $data['is_active']
            && $this->superAdminCount() <= 1
        ) {
            throw ValidationException::withMessages([
                'is_active' => ['At least one active Super Admin is required.'],
            ]);
        }

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

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->assertStaffMember($user);
        $this->deleteStaffMember($request, $user);

        return response()->json(['data' => ['ok' => true]]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:users,id'],
        ]);

        $users = User::query()->whereIn('id', $data['ids'])->get();
        $deleted = 0;

        foreach ($users as $user) {
            if (! $user->hasAnyRole($this->adminRoleNames())) {
                continue;
            }
            $this->deleteStaffMember($request, $user);
            $deleted++;
        }

        return response()->json(['data' => ['ok' => true, 'count' => $deleted]]);
    }

    private function deleteStaffMember(Request $request, User $user): void
    {
        if ($user->id === $request->user()?->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot delete your own account.'],
            ]);
        }

        if ($user->hasRole('super_admin') && $this->superAdminCount() <= 1) {
            throw ValidationException::withMessages([
                'user' => ['At least one Super Admin is required.'],
            ]);
        }

        $user->tokens()->delete();
        $user->syncRoles([]);
        $user->delete();
    }

    /** @return list<string> */
    private function adminRoleNames(): array
    {
        return Role::query()
            ->whereNotIn('name', ['customer', 'seller'])
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }

    private function assertStaffMember(User $user): void
    {
        if (! $user->hasAnyRole($this->adminRoleNames())) {
            abort(404);
        }
    }

    private function superAdminCount(): int
    {
        return User::role('super_admin')->where('is_active', true)->count();
    }
}
