<?php

namespace MarkdownSupport\Tests\Unit\Security;

use PHPUnit\Framework\TestCase;
use MarkdownThreadEntryBody;

/**
 * XSS Prevention Security Tests
 *
 * CRITICAL SECURITY TESTS - These tests verify that the 2-layer XSS protection
 * (Parsedown SafeMode + Format::sanitize()) effectively blocks all known XSS vectors.
 *
 * Testing Strategy:
 * - Layer 1: Parsedown SafeMode escapes inline HTML
 * - Layer 2: Format::sanitize() removes javascript: URLs and dangerous attributes
 *
 * @group security
 * @group critical
 */
class XSSPreventionTest extends TestCase
{
    private $markdownBody;

    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test 1: Inline <script> tags are escaped
     *
     * Attack Vector: Direct script injection
     * Expected: Script tags are HTML-escaped, not executed
     */
    public function testParsedownEscapesInlineScriptTags(): void
    {
        $maliciousMarkdown = '<script>alert("XSS")</script>';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // Script tags should be escaped
        $this->assertStringNotContainsString('<script>', $html, 'Script tags must be escaped');
        $this->assertStringNotContainsString('alert("XSS")', $html, 'JavaScript code must be escaped');

        // Should contain escaped version
        $this->assertStringContainsString('&lt;script&gt;', $html, 'Script tags should be HTML-encoded');
    }

    /**
     * Test 2: Image onerror event handlers are blocked
     *
     * Attack Vector: <img src=x onerror=alert(1)>
     * Expected: onerror attribute is stripped
     */
    public function testParsedownBlocksImageOnerrorEvents(): void
    {
        $maliciousMarkdown = '<img src=x onerror=alert(1)>';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // Event handler should be removed
        $this->assertStringNotContainsString('onerror=', $html, 'onerror event handler must be stripped');
        $this->assertStringNotContainsString('alert(1)', $html, 'JavaScript code must be removed');
    }

    /**
     * Test 3: javascript: URLs in Markdown links are sanitized
     *
     * Attack Vector: [Click Me](javascript:alert(1))
     * Expected: javascript: URL is removed/blocked or made safe
     */
    public function testFormatSanitizeRemovesJavascriptUrls(): void
    {
        $maliciousMarkdown = '[Click Me](javascript:alert(1))';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // JavaScript URL should NOT be executable (either removed or encoded)
        // Parsedown URL-encodes the colon, making it safe
        $this->assertStringNotContainsString('href="javascript:', $html,
            'javascript: URLs must not be directly executable in href');
    }

    /**
     * Test 4: URL-encoded javascript: URLs are blocked
     *
     * Attack Vector: [Click](java%09script:alert(1))
     * Expected: URL-encoded javascript: is not directly executable
     */
    public function testUrlEncodedJavascriptIsBlocked(): void
    {
        $vectors = [
            '[Link](java%09script:alert(1))',        // Tab-encoded
            '[Link](java%0dscript:alert(1))',        // CR-encoded
            '[Link](java%0ascript:alert(1))',        // LF-encoded
            '[Link](java%20script:alert(1))',        // Space-encoded
        ];

        foreach ($vectors as $maliciousMarkdown) {
            $body = new MarkdownThreadEntryBody($maliciousMarkdown);
            $html = $body->display();

            // The key security check: href should not contain executable "javascript:"
            $this->assertStringNotContainsString('href="javascript:', $html,
                "Executable JavaScript URLs must be blocked: {$maliciousMarkdown}");
        }
    }

    /**
     * Test 5: Event handlers (onclick, onload, etc.) are stripped
     *
     * Attack Vector: <div onclick="alert(1)">Click</div>
     * Expected: Event handlers are removed
     */
    public function testEventHandlersAreStripped(): void
    {
        $eventHandlers = [
            '<div onclick="alert(1)">Click</div>',
            '<img src=x onload=alert(1)>',
            '<body onload="alert(1)">',
            '<svg onload=alert(1)>',
            '<input onfocus=alert(1) autofocus>',
        ];

        foreach ($eventHandlers as $maliciousMarkdown) {
            $body = new MarkdownThreadEntryBody($maliciousMarkdown);
            $html = $body->display();

            $this->assertStringNotContainsString('onclick=', $html, 'onclick must be stripped');
            $this->assertStringNotContainsString('onload=', $html, 'onload must be stripped');
            $this->assertStringNotContainsString('onfocus=', $html, 'onfocus must be stripped');
            $this->assertStringNotContainsString('alert(1)', $html, 'JavaScript code must be removed');
        }
    }

    /**
     * Test 6: Data URIs with malicious scripts are blocked
     *
     * Attack Vector: <img src="data:text/html,<script>alert(1)</script>">
     * Expected: Data URIs are stripped
     */
    public function testDataUrisAreBlocked(): void
    {
        $maliciousMarkdown = '<img src="data:text/html,<script>alert(1)</script>">';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // Data URI should be removed
        $this->assertStringNotContainsString('data:', $html, 'data: URIs must be blocked');
        $this->assertStringNotContainsString('alert(1)', $html, 'JavaScript code must be removed');
    }

    /**
     * Test 7: SVG-based XSS is blocked
     *
     * Attack Vector: <svg><script>alert(1)</script></svg>
     * Expected: SVG with script is escaped, not executable
     */
    public function testSvgBasedXssIsBlocked(): void
    {
        $vectors = [
            '<svg><script>alert(1)</script></svg>',
            '<svg onload=alert(1)>',
            '<svg><foreignObject><script>alert(1)</script></foreignObject></svg>',
        ];

        foreach ($vectors as $maliciousMarkdown) {
            $body = new MarkdownThreadEntryBody($maliciousMarkdown);
            $html = $body->display();

            // Script tags should be escaped (not executable)
            $this->assertStringNotContainsString('<script>', $html,
                "Executable script tags must be escaped: {$maliciousMarkdown}");
            $this->assertStringNotContainsString('<svg', $html,
                "SVG tags should be escaped: {$maliciousMarkdown}");
        }
    }

    /**
     * Test 8: Case-insensitive javascript: URLs are blocked
     *
     * Attack Vector: [Link](JavaScript:alert(1))
     * Expected: Case variations are not directly executable
     */
    public function testCaseInsensitiveJavascriptUrlsBlocked(): void
    {
        $vectors = [
            '[Link](JavaScript:alert(1))',
            '[Link](JAVASCRIPT:alert(1))',
            '[Link](JaVaScRiPt:alert(1))',
        ];

        foreach ($vectors as $maliciousMarkdown) {
            $body = new MarkdownThreadEntryBody($maliciousMarkdown);
            $html = $body->display();

            // None of the case variations should be directly executable
            $this->assertDoesNotMatchRegularExpression('/href="javascript:/i', $html,
                "Executable JavaScript URLs must be blocked: {$maliciousMarkdown}");
        }
    }

    /**
     * Test 9: Mixed Markdown + HTML XSS attempts are blocked
     *
     * Attack Vector: **Bold <script>alert(1)</script> Text**
     * Expected: Markdown is rendered, but HTML script is escaped
     */
    public function testMixedMarkdownHtmlXssBlocked(): void
    {
        $maliciousMarkdown = '**Bold <script>alert(1)</script> Text**';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // Bold markdown should work
        $this->assertStringContainsString('<strong>', $html, 'Markdown bold should render');

        // But script should be escaped (not executable)
        $this->assertStringNotContainsString('<script>', $html, 'Script tags must be escaped');
        // The text "alert(1)" will be present but HTML-escaped as &lt;script&gt;alert(1)&lt;/script&gt;
        $this->assertStringContainsString('&lt;script&gt;', $html, 'Script tags should be HTML-encoded');
    }

    /**
     * Test 10: Nested XSS attempts are blocked
     *
     * Attack Vector: <div><div><script>alert(1)</script></div></div>
     * Expected: Nested malicious HTML is escaped
     */
    public function testNestedXssAttemptsBlocked(): void
    {
        $maliciousMarkdown = '<div><div><script>alert(1)</script></div></div>';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // All HTML should be escaped (not executable)
        $this->assertStringNotContainsString('<script>', $html, 'Nested script tags must be escaped');
        $this->assertStringContainsString('&lt;script&gt;', $html, 'Script tags should be HTML-encoded');
    }

    /**
     * Test 11: <iframe> tags are blocked
     *
     * Attack Vector: <iframe src="evil.com"></iframe>
     * Expected: iframe tags are escaped (not executable)
     */
    public function testIframeTagsAreBlocked(): void
    {
        $maliciousMarkdown = '<iframe src="evil.com"></iframe>';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // iframe should be escaped (not executable)
        $this->assertStringNotContainsString('<iframe', $html, 'iframe tags must be escaped');
        $this->assertStringContainsString('&lt;iframe', $html, 'iframe should be HTML-encoded');
    }

    /**
     * Test 12: <object> and <embed> tags are blocked
     *
     * Attack Vector: <object data="javascript:alert(1)"></object>
     * Expected: object/embed tags are escaped (not executable)
     */
    public function testObjectAndEmbedTagsBlocked(): void
    {
        $vectors = [
            '<object data="javascript:alert(1)"></object>',
            '<embed src="javascript:alert(1)">',
            '<applet code="malicious.class"></applet>',
        ];

        foreach ($vectors as $maliciousMarkdown) {
            $body = new MarkdownThreadEntryBody($maliciousMarkdown);
            $html = $body->display();

            // Tags should be escaped (not executable)
            $this->assertStringNotContainsString('<object', $html, 'object tags must be escaped');
            $this->assertStringNotContainsString('<embed', $html, 'embed tags must be escaped');
            $this->assertStringNotContainsString('<applet', $html, 'applet tags must be escaped');
        }
    }

    /**
     * Test 13: <meta> and <link> tags are blocked
     *
     * Attack Vector: <meta http-equiv="refresh" content="0;url=evil.com">
     * Expected: meta/link tags are removed
     */
    public function testMetaAndLinkTagsBlocked(): void
    {
        $vectors = [
            '<meta http-equiv="refresh" content="0;url=evil.com">',
            '<link rel="stylesheet" href="javascript:alert(1)">',
        ];

        foreach ($vectors as $maliciousMarkdown) {
            $body = new MarkdownThreadEntryBody($maliciousMarkdown);
            $html = $body->display();

            $this->assertStringNotContainsString('<meta', $html, 'meta tags must be removed');
            $this->assertStringNotContainsString('<link', $html, 'link tags must be removed');
            $this->assertStringNotContainsString('evil.com', $html, 'Malicious URL must be removed');
        }
    }

    /**
     * Test 14: HTML entity-encoded XSS is blocked
     *
     * Attack Vector: &#60;script&#62;alert(1)&#60;/script&#62;
     * Expected: HTML entities remain encoded or are double-encoded
     */
    public function testHtmlEntityEncodedXssBlocked(): void
    {
        $maliciousMarkdown = '&#60;script&#62;alert(1)&#60;/script&#62;';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // Script should never be executable
        $this->assertStringNotContainsString('<script>', $html, 'Script tags must not be executable');
        // HTML entities should remain safe (either as-is or double-encoded)
        $this->assertMatchesRegularExpression('/&#60;|&amp;#60;/', $html,
            'HTML entities should remain encoded');
    }

    /**
     * Test 15: Base64-encoded JavaScript in data URIs is blocked
     *
     * Attack Vector: <img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">
     * Expected: Base64-encoded malicious data is blocked
     */
    public function testBase64EncodedDataUriBlocked(): void
    {
        // Base64: <script>alert(1)</script>
        $maliciousMarkdown = '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        $this->assertStringNotContainsString('data:', $html, 'data: URIs must be blocked');
        $this->assertStringNotContainsString('base64', $html, 'Base64 data URIs must be blocked');
    }

    /**
     * Test 16: <form> tags are blocked (phishing prevention)
     *
     * Attack Vector: <form action="evil.com"><input type="submit"></form>
     * Expected: form tags are escaped (not executable)
     */
    public function testFormTagsBlocked(): void
    {
        $maliciousMarkdown = '<form action="evil.com"><input type="submit" value="Click"></form>';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // form tags should be escaped (not executable)
        $this->assertStringNotContainsString('<form', $html, 'form tags must be escaped');
        $this->assertStringContainsString('&lt;form', $html, 'form should be HTML-encoded');
    }

    /**
     * Test 17: <style> tags with expression() are blocked
     *
     * Attack Vector: <style>body{background:expression(alert(1))}</style>
     * Expected: style tags are escaped (not executable)
     */
    public function testStyleTagsWithExpressionBlocked(): void
    {
        $maliciousMarkdown = '<style>body{background:expression(alert(1))}</style>';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // style tags should be escaped (not executable)
        $this->assertStringNotContainsString('<style', $html, 'style tags must be escaped');
        $this->assertStringContainsString('&lt;style', $html, 'style should be HTML-encoded');
    }

    /**
     * Test 18: Markdown images with javascript: URLs are blocked
     *
     * Attack Vector: ![Alt](javascript:alert(1))
     * Expected: javascript: URL is not directly executable
     */
    public function testMarkdownImageWithJavascriptUrlBlocked(): void
    {
        $maliciousMarkdown = '![Alt Text](javascript:alert(1))';
        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // The key security check: src should not contain executable "javascript:"
        $this->assertStringNotContainsString('src="javascript:', $html,
            'javascript: URLs must not be directly executable in src');
    }

    /**
     * Test 19: Multiple XSS vectors in one input are all blocked
     *
     * Attack Vector: Combination of multiple attack techniques
     * Expected: All vectors are neutralized
     */
    public function testMultipleXssVectorsBlocked(): void
    {
        $maliciousMarkdown = <<<'MARKDOWN'
# Heading <script>alert(1)</script>

[Link](javascript:alert(2))

<img src=x onerror=alert(3)>

<iframe src="evil.com"></iframe>

![Image](data:text/html,<script>alert(4)</script>)
MARKDOWN;

        $body = new MarkdownThreadEntryBody($maliciousMarkdown);
        $html = $body->display();

        // Verify all XSS vectors are blocked
        $this->assertStringNotContainsString('<script>', $html, 'Script tags must be escaped');
        $this->assertStringNotContainsString('javascript:', $html, 'javascript: URLs must be blocked');
        $this->assertStringNotContainsString('onerror=', $html, 'Event handlers must be stripped');
        $this->assertStringNotContainsString('<iframe', $html, 'iframe tags must be removed');
        $this->assertStringNotContainsString('data:', $html, 'data: URIs must be blocked');

        // But valid Markdown should still work
        $this->assertStringContainsString('<h1>', $html, 'Valid Markdown heading should render');
    }

    /**
     * Test 20: Safe Markdown renders correctly (regression test)
     *
     * This test ensures our XSS prevention doesn't break valid Markdown
     */
    public function testSafeMarkdownRendersCorrectly(): void
    {
        $safeMarkdown = <<<'MARKDOWN'
# Safe Heading

**Bold text** and *italic text*

[Safe Link](https://example.com)

![Safe Image](https://example.com/image.png)

- List item 1
- List item 2

Code: `function test() { return true; }`
MARKDOWN;

        $body = new MarkdownThreadEntryBody($safeMarkdown);
        $html = $body->display();

        // Verify safe Markdown renders correctly
        $this->assertStringContainsString('<h1>Safe Heading</h1>', $html);
        $this->assertStringContainsString('<strong>Bold text</strong>', $html);
        $this->assertStringContainsString('<em>italic text</em>', $html);
        $this->assertStringContainsString('href="https://example.com"', $html);
        $this->assertStringContainsString('<ul>', $html);
        $this->assertStringContainsString('<code>function test()', $html);
    }
}
