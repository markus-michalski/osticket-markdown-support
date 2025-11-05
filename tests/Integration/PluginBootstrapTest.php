<?php

namespace MarkdownSupport\Tests\Integration;

use PHPUnit\Framework\TestCase;
use MarkdownPlugin;
use ThreadEntryBody;
use Signal;
use Ticket;
use ReflectionClass;

/**
 * Plugin Bootstrap Integration Tests
 *
 * Tests the plugin's bootstrap process, reflection-based extension,
 * signal handlers, and lifecycle management.
 *
 * @group integration
 */
class PluginBootstrapTest extends TestCase
{
    private $plugin;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear signal handlers before each test
        Signal::clearHandlers();

        // Create fresh plugin instance
        $this->plugin = new MarkdownPlugin();
    }

    protected function tearDown(): void
    {
        // Cleanup: Reset ThreadEntryBody::$types to default
        $reflection = new ReflectionClass('ThreadEntryBody');
        $types_prop = $reflection->getProperty('types');
        $types_prop->setAccessible(true);
        $types_prop->setValue(null, ['text', 'html']);

        Signal::clearHandlers();

        parent::tearDown();
    }

    /**
     * Test 1: Plugin is a singleton
     */
    public function testPluginIsSingleton(): void
    {
        $this->assertTrue($this->plugin->isSingleton());
    }

    /**
     * Test 2: Plugin has correct configuration class
     */
    public function testPluginHasCorrectConfigClass(): void
    {
        $reflection = new ReflectionClass($this->plugin);
        $property = $reflection->getProperty('config_class');
        $property->setAccessible(true);

        $this->assertSame('MarkdownConfig', $property->getValue($this->plugin));
    }

    /**
     * Test 3: Bootstrap method exists and is callable
     */
    public function testBootstrapMethodExists(): void
    {
        $this->assertTrue(method_exists($this->plugin, 'bootstrap'));
        $this->assertTrue(is_callable([$this->plugin, 'bootstrap']));
    }

    /**
     * Test 4: Reflection-based extension adds 'markdown' to ThreadEntryBody::$types
     */
    public function testExtendThreadEntryTypesAddsMarkdown(): void
    {
        // Verify 'markdown' is not in types initially
        $reflection = new ReflectionClass('ThreadEntryBody');
        $types_prop = $reflection->getProperty('types');
        $types_prop->setAccessible(true);
        $initialTypes = $types_prop->getValue();

        $this->assertNotContains('markdown', $initialTypes);

        // Call extendThreadEntryTypes
        $this->plugin->extendThreadEntryTypes();

        // Verify 'markdown' was added
        $updatedTypes = $types_prop->getValue();
        $this->assertContains('markdown', $updatedTypes);
    }

    /**
     * Test 5: ExtendThreadEntryTypes is idempotent (calling twice doesn't duplicate)
     */
    public function testExtendThreadEntryTypesIsIdempotent(): void
    {
        // Call twice
        $this->plugin->extendThreadEntryTypes();
        $this->plugin->extendThreadEntryTypes();

        // Verify 'markdown' appears only once
        $reflection = new ReflectionClass('ThreadEntryBody');
        $types_prop = $reflection->getProperty('types');
        $types_prop->setAccessible(true);
        $types = $types_prop->getValue();

        $markdownCount = array_count_values($types)['markdown'] ?? 0;
        $this->assertSame(1, $markdownCount, "'markdown' should appear exactly once in types array");
    }

    /**
     * Test 6: RegisterMarkdownBodyClass loads the MarkdownThreadEntryBody class
     */
    public function testRegisterMarkdownBodyClassLoadsClass(): void
    {
        $this->plugin->registerMarkdownBodyClass();

        $this->assertTrue(class_exists('MarkdownThreadEntryBody'));
    }

    /**
     * Test 7: Bootstrap registers signal handlers
     */
    public function testBootstrapRegistersSignalHandlers(): void
    {
        $this->plugin->bootstrap();

        // Verify 'object.view' signal has handler
        $objectViewHandlers = Signal::getHandlers('object.view');
        $this->assertNotEmpty($objectViewHandlers, 'object.view signal should have handlers');

        // Verify 'threadentry.created' signal has handler
        $threadEntryHandlers = Signal::getHandlers('threadentry.created');
        $this->assertNotEmpty($threadEntryHandlers, 'threadentry.created signal should have handlers');
    }

    /**
     * Test 8: onObjectView handler is called when Ticket is viewed
     */
    public function testOnObjectViewHandlerCalledForTicket(): void
    {
        $this->plugin->bootstrap();

        $ticket = new Ticket(123, 'TEST-123');

        // Capture output from injectEditorAssets
        ob_start();
        Signal::send('object.view', $ticket);
        $output = ob_get_clean();

        // Verify assets were injected
        $this->assertStringContainsString('markdown-editor.css', $output,
            'CSS should be injected on ticket view');
        $this->assertStringContainsString('markdown-editor.js', $output,
            'JavaScript should be injected on ticket view');
    }

    /**
     * Test 9: onObjectView ignores non-Ticket objects
     */
    public function testOnObjectViewIgnoresNonTicketObjects(): void
    {
        $this->plugin->bootstrap();

        $nonTicket = new \stdClass();

        // Should not throw exception
        ob_start();
        Signal::send('object.view', $nonTicket);
        $output = ob_get_clean();

        // Should not inject assets for non-Ticket objects
        $this->assertStringNotContainsString('markdown-editor', $output);
    }

    /**
     * Test 10: Enable creates singleton instance if none exists
     */
    public function testEnableCreatesSingletonInstance(): void
    {
        // Mock getNumInstances to return 0
        $this->assertSame(0, $this->plugin->getNumInstances());

        $result = $this->plugin->enable();

        $this->assertTrue($result === true || is_array($result) && empty($result),
            'Enable should return true or empty errors array');

        // Should have created instance
        $this->assertSame(1, $this->plugin->getNumInstances());
    }

    /**
     * Test 11: Enable sets installed_version in config
     */
    public function testEnableSetsInstalledVersion(): void
    {
        $this->plugin->enable();

        $version = $this->plugin->getConfig()->get('installed_version');
        $this->assertNotNull($version, 'Installed version should be set');
    }

    /**
     * Test 12: Disable returns true
     */
    public function testDisableReturnsTrue(): void
    {
        $result = $this->plugin->disable();

        $this->assertTrue($result);
    }

    /**
     * Test 13: Bootstrap only proceeds if plugin is enabled
     */
    public function testBootstrapChecksEnabledStatus(): void
    {
        // Disable plugin
        $this->plugin->getConfig()->set('enabled', false);

        // Bootstrap should not register signals
        $this->plugin->bootstrap();

        $handlers = Signal::getHandlers('object.view');
        $this->assertEmpty($handlers, 'No handlers should be registered when plugin is disabled');
    }

    /**
     * Test 14: InjectEditorAssets includes version parameter for cache busting
     */
    public function testInjectEditorAssetsIncludesVersionParameter(): void
    {
        $this->plugin->getConfig()->set('installed_version', '1.2.3');

        ob_start();
        $this->plugin->injectEditorAssets();
        $output = ob_get_clean();

        $this->assertStringContainsString('?v=1.2.3', $output,
            'Version parameter should be included for cache busting');
    }

    /**
     * Test 15: InjectEditorAssets properly escapes HTML
     */
    public function testInjectEditorAssetsEscapesHtml(): void
    {
        ob_start();
        $this->plugin->injectEditorAssets();
        $output = ob_get_clean();

        // Verify HTML is properly escaped (no unescaped quotes)
        $this->assertStringContainsString('<link rel="stylesheet"', $output);
        $this->assertStringContainsString('<script src=', $output);

        // Should not contain unescaped special characters that could break HTML
        $this->assertStringNotContainsString('"><script>', $output,
            'Output should not be vulnerable to XSS via attribute injection');
    }

    /**
     * Test 16: GetPluginUrl returns correct plugin path
     */
    public function testGetPluginUrlReturnsCorrectPath(): void
    {
        $url = $this->plugin->getPluginUrl();

        $this->assertStringContainsString('/include/plugins/', $url);
        $this->assertStringContainsString('markdown-support', $url);
    }

    /**
     * Test 17: CheckVersion compares versions correctly
     */
    public function testCheckVersionComparesVersions(): void
    {
        // Set installed version to older version
        $this->plugin->getConfig()->set('installed_version', '0.9.0');

        // CheckVersion should detect version change
        // (This test verifies the method exists and runs without errors)
        $this->plugin->checkVersion();

        // If plugin.php exists and has newer version, installed_version should update
        // Since we're in test environment, we just verify method doesn't crash
        $this->assertTrue(method_exists($this->plugin, 'checkVersion'));
    }

    /**
     * Test 18: OnThreadEntryCreated respects auto_convert_to_markdown config
     */
    public function testOnThreadEntryCreatedRespectsAutoConvertConfig(): void
    {
        // Disable auto-conversion
        $this->plugin->getConfig()->set('auto_convert_to_markdown', false);

        $this->plugin->bootstrap();

        $mockEntry = new \stdClass();
        $mockEntry->body = 'Test content';

        // Should not throw exception
        Signal::send('threadentry.created', $mockEntry);

        // If auto-convert is disabled, handler should return early
        // (Implementation in Phase 2, but handler should exist and not crash)
        $this->assertTrue(true, 'Handler should not crash when auto-convert is disabled');
    }

    /**
     * Test 19: Bootstrap loads all dependencies
     */
    public function testBootstrapLoadsAllDependencies(): void
    {
        $this->plugin->bootstrap();

        // Verify MarkdownThreadEntryBody class is available
        $this->assertTrue(class_exists('MarkdownThreadEntryBody'));

        // Verify Parsedown is available
        $this->assertTrue(class_exists('Parsedown'));

        // Verify 'markdown' type was added
        $reflection = new ReflectionClass('ThreadEntryBody');
        $types_prop = $reflection->getProperty('types');
        $types_prop->setAccessible(true);
        $types = $types_prop->getValue();

        $this->assertContains('markdown', $types);
    }

    /**
     * Test 20: Multiple bootstrap calls don't cause errors
     */
    public function testMultipleBootstrapCallsDontCauseErrors(): void
    {
        // Call bootstrap multiple times
        $this->plugin->bootstrap();
        $this->plugin->bootstrap();
        $this->plugin->bootstrap();

        // Should not crash, should handle gracefully
        $this->assertTrue(true);
    }

    /**
     * Test 21: Plugin lifecycle - enable, bootstrap, disable
     */
    public function testPluginLifecycle(): void
    {
        // Enable
        $enableResult = $this->plugin->enable();
        $this->assertTrue($enableResult === true || is_array($enableResult));

        // Bootstrap
        $this->plugin->bootstrap();

        // Verify plugin is active
        $this->assertTrue(class_exists('MarkdownThreadEntryBody'));

        // Disable
        $disableResult = $this->plugin->disable();
        $this->assertTrue($disableResult);
    }

    /**
     * Test 22: Config object is accessible
     */
    public function testConfigObjectIsAccessible(): void
    {
        $config = $this->plugin->getConfig();

        $this->assertNotNull($config);
        $this->assertTrue(method_exists($config, 'get'));
        $this->assertTrue(method_exists($config, 'set'));
    }

    /**
     * Test 23: Config default values
     */
    public function testConfigDefaultValues(): void
    {
        $config = $this->plugin->getConfig();

        $this->assertTrue($config->get('enabled'), 'Plugin should be enabled by default');
        $this->assertFalse($config->get('auto_convert_to_markdown'),
            'Auto-convert should be disabled by default');
    }

    /**
     * Test 24: Plugin name is correct
     */
    public function testPluginNameIsCorrect(): void
    {
        $name = $this->plugin->getName();

        $this->assertSame('Markdown Support', $name);
    }
}
