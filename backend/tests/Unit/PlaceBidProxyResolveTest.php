<?php

namespace Tests\Unit;

use App\Services\PlaceBidService;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class PlaceBidProxyResolveTest extends TestCase
{
    public function test_resolve_proxies_method_exists_and_is_private(): void
    {
        $reflection = new ReflectionClass(PlaceBidService::class);
        $this->assertTrue($reflection->hasMethod('resolveProxies'));
        $this->assertTrue($reflection->getMethod('resolveProxies')->isPrivate());
    }
}
