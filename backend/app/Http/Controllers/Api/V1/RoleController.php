<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\AdminPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::query()
            ->whereIn('name', array_keys(AdminPermissions::ROLE_MAP))
            ->with('permissions')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->name,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->values(),
            ]);

        return response()->json([
            'data' => [
                'roles' => $roles,
                'permissions' => AdminPermissions::ALL,
            ],
        ]);
    }

    public function update(Request $request, string $role): JsonResponse
    {
        if ($role === 'super_admin') {
            throw ValidationException::withMessages([
                'role' => ['The super_admin role cannot be restricted.'],
            ]);
        }

        if (! array_key_exists($role, AdminPermissions::ROLE_MAP)) {
            abort(404);
        }

        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', Rule::in(AdminPermissions::ALL)],
        ]);

        $model = Role::findByName($role, 'web');

        foreach ($data['permissions'] as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $model->syncPermissions($data['permissions']);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'data' => [
                'id' => $model->name,
                'name' => $model->name,
                'permissions' => $model->permissions()->pluck('name')->values(),
            ],
        ]);
    }
}
