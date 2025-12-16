<?php

declare(strict_types=1);

namespace MarkdownSupport\Tests\Unit\Format;

use MarkdownSupport\Format\MarkdownSanitizer;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MarkdownSupport\Format\MarkdownSanitizer
 */
final class MarkdownSanitizerTest extends TestCase
{
    /** @test */
    public function it_returns_empty_string_for_empty_input(): void
    {
        $this->assertSame('', MarkdownSanitizer::sanitize(''));
    }

    /** @test */
    public function it_does_not_modify_safe_html(): void
    {
        $safeHtml = '<p>Hello <strong>World</strong>!</p>';

        $this->assertSame($safeHtml, MarkdownSanitizer::sanitize($safeHtml));
    }

    /** @test */
    public function it_blocks_javascript_urls_in_href(): void
    {
        $malicious = '<a href="javascript:alert(1)">Click</a>';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('javascript:', $sanitized);
        $this->assertStringContainsString('data-blocked-href', $sanitized);
    }

    /** @test */
    public function it_blocks_javascript_urls_in_src(): void
    {
        $malicious = '<img src="javascript:alert(1)">';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('javascript:', $sanitized);
        $this->assertStringContainsString('data-blocked-src', $sanitized);
    }

    /** @test */
    public function it_blocks_data_urls(): void
    {
        $malicious = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('data:', $sanitized);
        $this->assertStringContainsString('data-blocked-href', $sanitized);
    }

    /** @test */
    public function it_removes_onclick_handlers(): void
    {
        $malicious = '<button onclick="alert(1)">Click</button>';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('onclick', $sanitized);
    }

    /** @test */
    public function it_removes_onerror_handlers(): void
    {
        $malicious = '<img src="x" onerror="alert(1)">';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('onerror', $sanitized);
    }

    /** @test */
    public function it_removes_onload_handlers(): void
    {
        $malicious = '<body onload="alert(1)">';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('onload', $sanitized);
    }

    /** @test */
    public function it_removes_multiple_event_handlers_in_same_tag(): void
    {
        $malicious = '<div onclick="a()" onmouseover="b()" onload="c()">Test</div>';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('onclick', $sanitized);
        $this->assertStringNotContainsString('onmouseover', $sanitized);
        $this->assertStringNotContainsString('onload', $sanitized);
    }

    /** @test */
    public function it_removes_expression_css(): void
    {
        $malicious = '<div style="background: expression(alert(1))">Test</div>';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('expression', $sanitized);
    }

    /** @test */
    public function it_removes_script_tags(): void
    {
        $malicious = '<script>alert(1)</script>';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('<script', $sanitized);
        $this->assertStringNotContainsString('alert', $sanitized);
    }

    /** @test */
    public function it_handles_case_insensitive_javascript(): void
    {
        $variants = [
            '<a href="JAVASCRIPT:alert(1)">1</a>',
            '<a href="JavaScript:alert(1)">2</a>',
            '<a href="JaVaScRiPt:alert(1)">3</a>',
        ];

        foreach ($variants as $malicious) {
            $sanitized = MarkdownSanitizer::sanitize($malicious);
            $this->assertStringNotContainsStringIgnoringCase('javascript:', $sanitized);
        }
    }

    /** @test */
    public function it_handles_case_insensitive_event_handlers(): void
    {
        $variants = [
            '<div ONCLICK="alert(1)">1</div>',
            '<div OnClick="alert(1)">2</div>',
            '<div oNcLiCk="alert(1)">3</div>',
        ];

        foreach ($variants as $malicious) {
            $sanitized = MarkdownSanitizer::sanitize($malicious);
            $this->assertStringNotContainsStringIgnoringCase('onclick', $sanitized);
        }
    }

    /** @test */
    public function it_preserves_valid_styles(): void
    {
        $validHtml = '<div style="color: red; font-size: 14px;">Test</div>';
        $sanitized = MarkdownSanitizer::sanitize($validHtml);

        $this->assertStringContainsString('style=', $sanitized);
        $this->assertStringContainsString('color: red', $sanitized);
    }

    /** @test */
    public function it_preserves_valid_links(): void
    {
        $validHtml = '<a href="https://example.com">Link</a>';
        $sanitized = MarkdownSanitizer::sanitize($validHtml);

        $this->assertSame($validHtml, $sanitized);
    }

    /** @test */
    public function it_preserves_valid_images(): void
    {
        $validHtml = '<img src="https://example.com/image.png" alt="Image">';
        $sanitized = MarkdownSanitizer::sanitize($validHtml);

        $this->assertSame($validHtml, $sanitized);
    }

    /** @test */
    public function it_handles_unquoted_event_handlers(): void
    {
        $malicious = '<div onclick=alert(1)>Test</div>';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('onclick', $sanitized);
        $this->assertStringNotContainsString('alert', $sanitized);
    }

    /** @test */
    public function it_handles_complex_xss_payload(): void
    {
        $malicious = '<img src=x onerror="javascript:alert(1)" onclick="eval(atob(\'YWxlcnQoMSk=\'))"/>';
        $sanitized = MarkdownSanitizer::sanitize($malicious);

        $this->assertStringNotContainsString('onerror', $sanitized);
        $this->assertStringNotContainsString('onclick', $sanitized);
        $this->assertStringNotContainsString('javascript:', $sanitized);
    }
}
