<?php

declare(strict_types=1);

namespace MarkdownSupport\Tests\Unit\Config;

use MarkdownSupport\Config\ConfigCache;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MarkdownSupport\Config\ConfigCache
 */
final class ConfigCacheTest extends TestCase
{
    protected function setUp(): void
    {
        // Reset singleton between tests
        ConfigCache::resetInstance();
    }

    protected function tearDown(): void
    {
        ConfigCache::resetInstance();
    }

    /** @test */
    public function it_returns_same_instance(): void
    {
        $instance1 = ConfigCache::getInstance();
        $instance2 = ConfigCache::getInstance();

        $this->assertSame($instance1, $instance2);
    }

    /** @test */
    public function it_populates_config_values(): void
    {
        $cache = ConfigCache::getInstance();
        $cache->populate([
            'key1' => 'value1',
            'key2' => true,
            'key3' => 42,
        ]);

        $this->assertTrue($cache->isPopulated());
        $this->assertSame('value1', $cache->get('key1'));
        $this->assertTrue($cache->get('key2'));
        $this->assertSame(42, $cache->get('key3'));
    }

    /** @test */
    public function it_returns_default_for_missing_keys(): void
    {
        $cache = ConfigCache::getInstance();

        $this->assertNull($cache->get('nonexistent'));
        $this->assertSame('default', $cache->get('nonexistent', 'default'));
        $this->assertSame(123, $cache->get('nonexistent', 123));
    }

    /** @test */
    public function it_sets_individual_values(): void
    {
        $cache = ConfigCache::getInstance();

        $cache->set('single_key', 'single_value');

        $this->assertSame('single_value', $cache->get('single_key'));
    }

    /** @test */
    public function it_overwrites_existing_values(): void
    {
        $cache = ConfigCache::getInstance();
        $cache->populate(['key' => 'original']);

        $cache->set('key', 'updated');

        $this->assertSame('updated', $cache->get('key'));
    }

    /** @test */
    public function it_returns_all_config_values(): void
    {
        $cache = ConfigCache::getInstance();
        $config = [
            'a' => 1,
            'b' => 2,
            'c' => 3,
        ];
        $cache->populate($config);

        $this->assertSame($config, $cache->all());
    }

    /** @test */
    public function it_clears_all_values(): void
    {
        $cache = ConfigCache::getInstance();
        $cache->populate(['key' => 'value']);

        $cache->clear();

        $this->assertFalse($cache->isPopulated());
        $this->assertNull($cache->get('key'));
        $this->assertEmpty($cache->all());
    }

    /** @test */
    public function it_is_not_populated_initially(): void
    {
        $cache = ConfigCache::getInstance();

        $this->assertFalse($cache->isPopulated());
    }

    /** @test */
    public function reset_instance_creates_new_singleton(): void
    {
        $instance1 = ConfigCache::getInstance();
        $instance1->set('marker', 'original');

        ConfigCache::resetInstance();

        $instance2 = ConfigCache::getInstance();

        $this->assertNotSame($instance1, $instance2);
        $this->assertNull($instance2->get('marker'));
    }
}
