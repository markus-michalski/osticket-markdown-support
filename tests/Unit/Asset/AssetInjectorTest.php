<?php

declare(strict_types=1);

namespace MarkdownSupport\Tests\Unit\Asset;

use MarkdownSupport\Asset\AssetInjector;
use MarkdownSupport\Config\ConfigCache;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MarkdownSupport\Asset\AssetInjector
 */
final class AssetInjectorTest extends TestCase
{
    private ConfigCache $configCache;

    protected function setUp(): void
    {
        ConfigCache::resetInstance();
        $this->configCache = ConfigCache::getInstance();
        $this->configCache->populate([
            'default_format' => 'markdown',
            'allow_format_switch' => true,
            'show_toolbar' => true,
            'installed_version' => '1.0.0',
        ]);
    }

    protected function tearDown(): void
    {
        ConfigCache::resetInstance();
    }

    /** @test */
    public function it_generates_config_script(): void
    {
        $injector = new AssetInjector('/plugins/markdown-support', $this->configCache);
        $html = $injector->getAssetsHtml();

        $this->assertStringContainsString('window.osTicketMarkdownConfig', $html);
        $this->assertStringContainsString('"defaultFormat":"markdown"', $html);
        $this->assertStringContainsString('"allowFormatSwitch":true', $html);
        $this->assertStringContainsString('"showToolbar":true', $html);
    }

    /** @test */
    public function it_includes_css_tag_with_cache_busting(): void
    {
        $injector = new AssetInjector('/plugins/markdown-support', $this->configCache);
        $html = $injector->getAssetsHtml();

        $this->assertStringContainsString('<link rel="stylesheet"', $html);
        $this->assertStringContainsString('markdown-editor.css?v=1.0.0', $html);
    }

    /** @test */
    public function it_includes_deferred_js_tag(): void
    {
        $injector = new AssetInjector('/plugins/markdown-support', $this->configCache);
        $html = $injector->getAssetsHtml();

        $this->assertStringContainsString('<script defer src=', $html);
        $this->assertStringContainsString('markdown-editor.js?v=1.0.0', $html);
    }

    /** @test */
    public function it_escapes_urls_properly(): void
    {
        $this->configCache->set('installed_version', '1.0.0&test=<script>');

        $injector = new AssetInjector('/plugins/markdown-support', $this->configCache);
        $html = $injector->getAssetsHtml();

        // URL encoding converts <script> to %3Cscript%3E
        $this->assertStringNotContainsString('><script>', $html);
        $this->assertStringContainsString('%3Cscript%3E', $html);
    }

    /** @test */
    public function it_injects_assets_before_head_closing_tag(): void
    {
        $injector = new AssetInjector('/plugins/markdown-support', $this->configCache);
        $buffer = '<html><head><title>Test</title></head><body></body></html>';

        $result = $injector->injectAssetsIntoOutput($buffer);

        $this->assertStringContainsString('osTicketMarkdownConfig', $result);
        // Assets should be before </head>
        $headEndPos = strpos($result, '</head>');
        $configPos = strpos($result, 'osTicketMarkdownConfig');
        $this->assertLessThan($headEndPos, $configPos);
    }

    /** @test */
    public function it_injects_assets_before_body_closing_tag_as_fallback(): void
    {
        $injector = new AssetInjector('/plugins/markdown-support', $this->configCache);
        $buffer = '<html><body><p>Content</p></body></html>';

        $result = $injector->injectAssetsIntoOutput($buffer);

        $this->assertStringContainsString('osTicketMarkdownConfig', $result);
        // Assets should be before </body>
        $bodyEndPos = strpos($result, '</body>');
        $configPos = strpos($result, 'osTicketMarkdownConfig');
        $this->assertLessThan($bodyEndPos, $configPos);
    }

    /** @test */
    public function it_prevents_double_injection(): void
    {
        $injector = new AssetInjector('/plugins/markdown-support', $this->configCache);
        $buffer = '<html><head>window.osTicketMarkdownConfig = {};</head></html>';

        $result = $injector->injectAssetsIntoOutput($buffer);

        // Should return unchanged (already injected)
        $this->assertSame($buffer, $result);
    }

    /** @test */
    public function it_appends_assets_when_no_closing_tags_found(): void
    {
        $injector = new AssetInjector('/plugins/markdown-support', $this->configCache);
        $buffer = '<div>Incomplete HTML';

        $result = $injector->injectAssetsIntoOutput($buffer);

        $this->assertStringStartsWith($buffer, $result);
        $this->assertStringContainsString('osTicketMarkdownConfig', $result);
    }

    /** @test */
    public function it_uses_default_values_when_config_missing(): void
    {
        $this->configCache->clear();
        $injector = new AssetInjector('/plugins/markdown-support', $this->configCache);

        $html = $injector->getAssetsHtml();

        $this->assertStringContainsString('"defaultFormat":"markdown"', $html);
        $this->assertStringContainsString('markdown-editor.css', $html);
        // No version parameter when version is empty
        $this->assertStringNotContainsString('?v=', $html);
    }
}
