<?php

namespace Tests\Feature;

use App\Models\StripeSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StripeSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        Permission::findOrCreate('admin.payments');
        $role = Role::findOrCreate('super_admin');
        $role->givePermissionTo('admin.payments');
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_admin_can_read_stripe_settings_with_webhook_url(): void
    {
        Sanctum::actingAs($this->admin());

        $this->getJson('/api/v1/admin/stripe-settings')
            ->assertOk()
            ->assertJsonPath('data.webhook_url', StripeSetting::webhookUrl())
            ->assertJsonStructure([
                'data' => [
                    'enabled',
                    'demo_mode',
                    'publishable_key',
                    'secret_key_set',
                    'webhook_secret_set',
                    'payment_method_types',
                    'available_payment_method_types',
                    'setup' => ['steps'],
                ],
            ]);
    }

    public function test_admin_can_save_keys_and_methods(): void
    {
        Sanctum::actingAs($this->admin());

        $this->putJson('/api/v1/admin/stripe-settings', [
            'enabled' => true,
            'demo_mode' => false,
            'publishable_key' => 'pk_test_example1234567890',
            'secret_key' => 'sk_test_example1234567890',
            'webhook_secret' => 'whsec_example1234567890',
            'payment_method_types' => ['card', 'sepa_debit', 'ideal'],
            'bank_transfer_enabled' => true,
        ])->assertOk()
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.secret_key_set', true)
            ->assertJsonPath('data.webhook_secret_set', true)
            ->assertJsonPath('data.publishable_key', 'pk_test_example1234567890');

        $this->assertContains('sepa_debit', StripeSetting::current()->checkoutPaymentMethodTypes());
        $this->assertSame('sk_test_example1234567890', StripeSetting::current()->secretKey());
    }
}
