<?php

namespace Tests\Feature;

use App\Models\FeatureSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CheckoutGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('customer');
        FeatureSetting::query()->updateOrCreate(['key' => 'store'], ['enabled' => true]);
        FeatureSetting::query()->updateOrCreate(['key' => 'maintenance_mode'], ['enabled' => false]);
        FeatureSetting::flushCache();
    }

    public function test_unverified_user_cannot_checkout(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
            'is_active' => true,
            'account_type' => 'private',
        ]);
        $user->assignRole('customer');
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/checkout', [
            'shipping_name' => 'Test User',
            'shipping_line1' => 'Street 1',
            'shipping_city' => 'Berlin',
            'shipping_postcode' => '10115',
            'shipping_country' => 'DE',
            'shipping_method_id' => 1,
        ])->assertStatus(422);
    }

    public function test_features_endpoint_returns_map(): void
    {
        $this->getJson('/api/v1/features')
            ->assertOk()
            ->assertJsonPath('data.store', true);
    }

    public function test_maintenance_blocks_catalog(): void
    {
        FeatureSetting::query()->updateOrCreate(['key' => 'maintenance_mode'], ['enabled' => true]);
        FeatureSetting::flushCache();

        $this->getJson('/api/v1/products')->assertStatus(503);
        $this->getJson('/api/v1/features')->assertOk();
    }
}
