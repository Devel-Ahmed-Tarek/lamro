<?php

namespace Tests\Feature;

use App\Models\AiSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AiSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        Permission::findOrCreate('admin.system');
        $role = Role::findOrCreate('super_admin');
        $role->givePermissionTo('admin.system');
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_admin_can_read_and_save_ai_settings(): void
    {
        Sanctum::actingAs($this->admin());

        $this->getJson('/api/v1/admin/ai-settings')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'provider',
                    'active_provider',
                    'groq' => ['key_set', 'model', 'docs_url'],
                    'gemini' => ['key_set', 'model', 'docs_url'],
                    'openai' => ['key_set', 'model', 'docs_url'],
                ],
            ]);

        $this->putJson('/api/v1/admin/ai-settings', [
            'provider' => 'openai',
            'openai_key' => 'sk-test-openai-example-key',
            'openai_model' => 'gpt-4o-mini',
            'groq_model' => 'llama-3.1-8b-instant',
        ])->assertOk()
            ->assertJsonPath('data.provider', 'openai')
            ->assertJsonPath('data.openai.key_set', true)
            ->assertJsonPath('data.active_provider', 'openai');

        $this->assertSame('sk-test-openai-example-key', AiSetting::current()->keyFor('openai'));
        $this->assertSame('openai', app(\App\Services\AiProductService::class)->provider());
    }

    public function test_falls_back_to_demo_when_provider_key_unavailable(): void
    {
        Sanctum::actingAs($this->admin());

        config([
            'services.ai.groq_key' => null,
            'services.ai.gemini_key' => null,
            'services.ai.openai_key' => null,
        ]);

        $this->putJson('/api/v1/admin/ai-settings', [
            'provider' => 'openai',
            'clear_openai_key' => true,
            'clear_groq_key' => true,
            'clear_gemini_key' => true,
        ])->assertOk()
            ->assertJsonPath('data.active_provider', 'demo');

        $this->assertSame('demo', AiSetting::current()->resolvedProvider());
    }
}
