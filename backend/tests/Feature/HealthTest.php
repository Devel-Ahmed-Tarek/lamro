<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_returns_ok(): void
    {
        // Health stays reachable even when feature tables are absent in bare test DB.
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.service', 'jala-api')
            ->assertJsonStructure(['data' => ['checks' => ['database', 'queue', 'cache']]]);
    }
}
