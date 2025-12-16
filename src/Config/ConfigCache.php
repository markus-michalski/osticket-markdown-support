<?php

declare(strict_types=1);

namespace MarkdownSupport\Config;

/**
 * ConfigCache - Thread-safe singleton for plugin configuration
 *
 * Solves the osTicket Signal callback problem where new plugin instances
 * are created without proper configuration context.
 *
 * Usage:
 *   // In bootstrap()
 *   ConfigCache::getInstance()->populate($config);
 *
 *   // In Signal callbacks
 *   $value = ConfigCache::getInstance()->get('key', 'default');
 *
 * @package MarkdownSupport
 */
final class ConfigCache
{
    private static ?self $instance = null;

    /** @var array<string, mixed> */
    private array $config = [];

    private bool $populated = false;

    /**
     * Private constructor to prevent direct instantiation
     */
    private function __construct()
    {
    }

    /**
     * Prevent cloning of the singleton instance
     */
    private function __clone()
    {
    }

    /**
     * Get singleton instance
     */
    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * Populate cache with configuration values
     *
     * Should be called once in bootstrap() with the real config values.
     *
     * @param array<string, mixed> $config Configuration key-value pairs
     */
    public function populate(array $config): void
    {
        $this->config = $config;
        $this->populated = true;
    }

    /**
     * Get configuration value
     *
     * @param string $key Configuration key
     * @param mixed $default Default value if key not found
     * @return mixed
     */
    public function get(string $key, mixed $default = null): mixed
    {
        return $this->config[$key] ?? $default;
    }

    /**
     * Set single configuration value
     *
     * @param string $key Configuration key
     * @param mixed $value Configuration value
     */
    public function set(string $key, mixed $value): void
    {
        $this->config[$key] = $value;
    }

    /**
     * Check if cache has been populated
     */
    public function isPopulated(): bool
    {
        return $this->populated;
    }

    /**
     * Get all cached configuration
     *
     * @return array<string, mixed>
     */
    public function all(): array
    {
        return $this->config;
    }

    /**
     * Clear all cached configuration
     *
     * Useful for testing.
     */
    public function clear(): void
    {
        $this->config = [];
        $this->populated = false;
    }

    /**
     * Reset singleton instance
     *
     * WARNING: Only use in tests!
     */
    public static function resetInstance(): void
    {
        self::$instance = null;
    }
}
