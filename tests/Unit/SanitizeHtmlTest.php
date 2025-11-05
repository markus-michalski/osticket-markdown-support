<?php

/**
 * Tests for sanitizeHtml() function in markdown-preview.php
 *
 * Tests XSS prevention layer that removes dangerous attributes and URLs.
 *
 * NOTE: This test loads the function from markdown-preview.php
 * by extracting it for testing purposes.
 */

use PHPUnit\Framework\TestCase;

class SanitizeHtmlTest extends TestCase
{
    /**
     * Load sanitizeHtml() function from markdown-preview.php
     */
    protected function setUp(): void
    {
        // Extract sanitizeHtml() function and make it available for testing
        if (!function_exists('sanitizeHtml')) {
            $apiFile = __DIR__ . '/../../markdown-preview.php';
            $content = file_get_contents($apiFile);

            // Extract just the sanitizeHtml() function
            preg_match('/function sanitizeHtml\(\$html\) \{.*?\n\}/s', $content, $matches);

            if (!empty($matches[0])) {
                eval($matches[0]);
            } else {
                $this->fail('Could not extract sanitizeHtml() function from markdown-preview.php');
            }
        }
    }

    /**
     * Test: javascript: URLs are blocked
     */
    public function testJavascriptUrlIsBlocked()
    {
        $html = '<a href="javascript:alert(\'XSS\')">Click</a>';
        $result = sanitizeHtml($html);

        $this->assertStringNotContainsString('javascript:', $result);
        $this->assertStringContainsString('data-blocked-href=', $result);
    }

    /**
     * Test: javascript: URLs (uppercase) are blocked
     */
    public function testJavascriptUrlUppercaseIsBlocked()
    {
        $html = '<a href="JAVASCRIPT:alert(\'XSS\')">Click</a>';
        $result = sanitizeHtml($html);

        $this->assertStringNotContainsString('JAVASCRIPT:', $result);
        $this->assertStringNotContainsString('javascript:', strtolower($result));
    }

    /**
     * Test: data: URLs are blocked
     */
    public function testDataUrlIsBlocked()
    {
        $html = '<img src="data:text/html,<script>alert(\'XSS\')</script>">';
        $result = sanitizeHtml($html);

        $this->assertStringNotContainsString('data:', $result);
        $this->assertStringContainsString('data-blocked-src=', $result);
    }

    /**
     * Test: onclick attribute is removed
     */
    public function testOnClickAttributeIsRemoved()
    {
        $html = '<div onclick="alert(\'XSS\')">Click</div>';
        $result = sanitizeHtml($html);

        $this->assertStringNotContainsString('onclick=', $result);
        $this->assertStringNotContainsString('alert(', $result);
    }

    /**
     * Test: onerror attribute is removed
     */
    public function testOnErrorAttributeIsRemoved()
    {
        $html = '<img src="x" onerror="alert(\'XSS\')">';
        $result = sanitizeHtml($html);

        $this->assertStringNotContainsString('onerror=', $result);
    }

    /**
     * Test: onload attribute is removed
     */
    public function testOnLoadAttributeIsRemoved()
    {
        $html = '<body onload="alert(\'XSS\')">';
        $result = sanitizeHtml($html);

        $this->assertStringNotContainsString('onload=', $result);
    }

    /**
     * Test: Multiple on* attributes are removed
     */
    public function testMultipleOnAttributesAreRemoved()
    {
        $html = '<div onclick="bad()" onmouseover="bad()" onmouseout="bad()">Test</div>';
        $result = sanitizeHtml($html);

        $this->assertStringNotContainsString('onclick=', $result);
        $this->assertStringNotContainsString('onmouseover=', $result);
        $this->assertStringNotContainsString('onmouseout=', $result);
    }

    /**
     * Test: style with expression() is removed (IE XSS)
     */
    public function testStyleExpressionIsRemoved()
    {
        $html = '<div style="width: expression(alert(\'XSS\'))">Test</div>';
        $result = sanitizeHtml($html);

        $this->assertStringNotContainsString('expression(', $result);
    }

    /**
     * Test: script tags are removed
     */
    public function testScriptTagsAreRemoved()
    {
        $html = 'Safe text <script>alert("XSS")</script> more text';
        $result = sanitizeHtml($html);

        $this->assertStringNotContainsString('<script>', $result);
        $this->assertStringNotContainsString('</script>', $result);
        $this->assertStringNotContainsString('alert(', $result);
        $this->assertStringContainsString('Safe text', $result);
        $this->assertStringContainsString('more text', $result);
    }

    /**
     * Test: Safe HTML is preserved
     */
    public function testSafeHtmlIsPreserved()
    {
        $html = '<p>This is <strong>bold</strong> and <em>italic</em>.</p>';
        $result = sanitizeHtml($html);

        $this->assertEquals($html, $result);
    }

    /**
     * Test: Safe links are preserved
     */
    public function testSafeLinksArePreserved()
    {
        $html = '<a href="https://example.com">Safe Link</a>';
        $result = sanitizeHtml($html);

        $this->assertStringContainsString('href="https://example.com"', $result);
        $this->assertStringContainsString('Safe Link', $result);
    }

    /**
     * Test: Safe images are preserved
     */
    public function testSafeImagesArePreserved()
    {
        $html = '<img src="https://example.com/image.png" alt="Safe">';
        $result = sanitizeHtml($html);

        $this->assertStringContainsString('src="https://example.com/image.png"', $result);
        $this->assertStringContainsString('alt="Safe"', $result);
    }

    /**
     * Test: Lists are preserved
     */
    public function testListsArePreserved()
    {
        $html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        $result = sanitizeHtml($html);

        $this->assertEquals($html, $result);
    }

    /**
     * Test: Code blocks are preserved
     */
    public function testCodeBlocksArePreserved()
    {
        $html = '<pre><code>echo "test";</code></pre>';
        $result = sanitizeHtml($html);

        $this->assertEquals($html, $result);
    }

    /**
     * Test: Empty HTML returns empty string
     */
    public function testEmptyHtmlReturnsEmpty()
    {
        $result = sanitizeHtml('');

        $this->assertEmpty($result);
    }

    /**
     * Test: Complex attack vector with multiple techniques
     */
    public function testComplexAttackIsFullyBlocked()
    {
        $html = '<div onclick="bad()">'
              . '<a href="javascript:alert(1)">Link</a>'
              . '<img src="x" onerror="alert(2)">'
              . '<script>alert(3)</script>'
              . '</div>';

        $result = sanitizeHtml($html);

        // All dangerous elements should be removed or blocked
        $this->assertStringNotContainsString('onclick=', $result);
        $this->assertStringNotContainsString('javascript:', $result);
        $this->assertStringNotContainsString('onerror=', $result);
        $this->assertStringNotContainsString('<script>', $result);

        // Note: "alert(" may remain in data-blocked-* attributes - that's OK (not executable)
        // Check that it's NOT in an executable context (href="javascript:...")
        $this->assertStringNotContainsString('href="javascript:', $result);
        $this->assertStringNotContainsString("href='javascript:", $result);
    }
}
