<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\AdminPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    private const PROTECTED = ['super_admin', 'customer', 'seller'];

    public function index(): JsonResponse
    {
        $roles = Role::query()
            ->whereNotIn('name', ['customer', 'seller'])
            ->with('permissions')
            ->withCount('users')
            ->orderByRaw("CASE WHEN name = 'super_admin' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => $this->serialize($role));

        return response()->json([
            'data' => [
                'roles' => $roles,
                'permissions' => AdminPermissions::ALL,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', 'regex:/^[a-z][a-z0-9_]*$/'],
            'label' => ['nullable', 'string', 'max:120'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::in(AdminPermissions::ALL)],
        ]);

        $name = Str::lower($data['name']);
        if (in_array($name, self::PROTECTED, true) || Role::query()->where('name', $name)->exists()) {
            throw ValidationException::withMessages([
                'name' => ['This role already exists or is reserved.'],
            ]);
        }

        $permissions = array_values(array_unique($data['permissions'] ?? []));
        if (! in_array('admin.profile', $permissions, true)) {
            $permissions[] = 'admin.profile';
        }
        if (! in_array('admin.overview', $permissions, true)) {
            $permissions[] = 'admin.overview';
        }

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $role = Role::create(['name' => $name, 'guard_name' => 'web']);
        $role->syncPermissions($permissions);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'data' => $this->serialize($role->load('permissions')->loadCount('users')),
        ], 201);
    }

    public function update(Request $request, string $role): JsonResponse
    {
        $model = Role::findByName($role, 'web');

        if ($model->name === 'super_admin') {
            throw ValidationException::withMessages([
                'role' => ['The super_admin role cannot be changed.'],
            ]);
        }

        if (in_array($model->name, ['customer', 'seller'], true)) {
            abort(404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80', 'regex:/^[a-z][a-z0-9_]*$/'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::in(AdminPermissions::ALL)],
        ]);

        if (array_key_exists('name', $data)) {
            $next = Str::lower($data['name']);
            if ($next !== $model->name) {
                if (in_array($next, self::PROTECTED, true) || Role::query()->where('name', $next)->exists()) {
                    throw ValidationException::withMessages([
                        'name' => ['This role name is reserved or already taken.'],
                    ]);
                }
                $model->name = $next;
                $model->save();
            }
        }

        if (array_key_exists('permissions', $data)) {
            $permissions = array_values(array_unique($data['permissions']));
            foreach ($permissions as $permission) {
                Permission::findOrCreate($permission, 'web');
            }
            $model->syncPermissions($permissions);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'data' => $this->serialize($model->fresh()->load('permissions')->loadCount('users')),
        ]);
    }

    public function destroy(string $role): JsonResponse
    {
        $model = Role::findByName($role, 'web');

        if (in_array($model->name, self::PROTECTED, true)) {
            throw ValidationException::withMessages([
                'role' => ['This role cannot be deleted.'],
            ]);
        }

        if ($model->users()->exists()) {
            throw ValidationException::withMessages([
                'role' => ['Reassign users before deleting this role.'],
            ]);
        }

        $model->delete();
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json(['data' => ['ok' => true]]);
    }

    /** @return array{id: string, name: string, locked: bool, users_count: int, permissions: list<string>} */
    private function serialize(Role $role): array
    {
        return [
            'id' => $role->name,
            'name' => $role->name,
            'locked' => $role->name === 'super_admin',
            'users_count' => (int) ($role->users_count ?? $role->users()->count()),
            'permissions' => $role->permissions->pluck('name')->values()->all(),
        ];
    }
}
