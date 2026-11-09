<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\AdminPermissions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (AdminPermissions::ALL as $permission) {
            Permission::query()->firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (AdminPermissions::ROLE_MAP as $roleName => $permissions) {
            $role = Role::query()->firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
            ]);

            $role->syncPermissions(
                Permission::query()
                    ->where('guard_name', 'web')
                    ->whereIn('name', $permissions)
                    ->get()
            );
        }

        Role::query()->firstOrCreate([
            'name' => 'customer',
            'guard_name' => 'web',
        ]);

        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@jala.de'],
            [
                'name' => 'Jala Admin',
                'password' => Hash::make('admin'),
                'phone' => '+49 221 000000',
                'is_active' => true,
            ],
        );
        $admin->syncRoles(['super_admin']);

        $ops = User::query()->updateOrCreate(
            ['email' => 'lea@jala.de'],
            [
                'name' => 'Lea Hoffmann',
                'password' => Hash::make('password'),
                'is_active' => true,
            ],
        );
        $ops->syncRoles(['ops']);

        $catalog = User::query()->updateOrCreate(
            ['email' => 'mark@jala.de'],
            [
                'name' => 'Mark Weber',
                'password' => Hash::make('password'),
                'is_active' => true,
            ],
        );
        $catalog->syncRoles(['catalog']);

        $customer = User::query()->updateOrCreate(
            ['email' => 'customer@jala.de'],
            [
                'name' => 'Demo Kunde',
                'password' => Hash::make('password'),
                'phone' => '+49 221 111111',
                'account_type' => 'private',
                'country' => 'DE',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );
        $customer->syncRoles(['customer']);
    }
}
