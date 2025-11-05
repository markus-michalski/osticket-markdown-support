<?php

/**
 * Tests for Markdown Preview Rendering Logic
 *
 * Tests the core rendering logic used by the Preview API to ensure
 * 100% identical output to backend rendering.
 *
 * NOTE: This test does NOT use the standard bootstrap because it tests
 * Parsedown rendering logic which has no osTicket dependencies.
 */

require_once __DIR__ . '/../../vendor/Parsedown.php';

use PHPUnit\Framework\TestCase;

class MarkdownPreviewTest extends TestCase
{
    private $parsedown;

    protected function setUp(): void
    {
        // Initialize Parsedown with SafeMode (same as API)
        $this->parsedown = new \Parsedown();
        $this->parsedown->setSafeMode(true);
    }

    /**
     * Test: Basic Markdown heading is rendered
     */
    public function testBasicHeadingIsRendered()
    {
        $markdown = "# Hello World";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<h1>Hello World</h1>', $html);
    }

    /**
     * Test: Bold text is rendered
     */
    public function testBoldTextIsRendered()
    {
        $markdown = "This is **bold** text.";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<strong>bold</strong>', $html);
    }

    /**
     * Test: Italic text is rendered
     */
    public function testItalicTextIsRendered()
    {
        $markdown = "This is *italic* text.";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<em>italic</em>', $html);
    }

    /**
     * Test: Unordered list is rendered
     */
    public function testUnorderedListIsRendered()
    {
        $markdown = "- Item 1\n- Item 2\n- Item 3";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<ul>', $html);
        $this->assertStringContainsString('<li>Item 1</li>', $html);
        $this->assertStringContainsString('<li>Item 2</li>', $html);
        $this->assertStringContainsString('<li>Item 3</li>', $html);
        $this->assertStringContainsString('</ul>', $html);
    }

    /**
     * Test: Ordered list is rendered
     */
    public function testOrderedListIsRendered()
    {
        $markdown = "1. First\n2. Second\n3. Third";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<ol>', $html);
        $this->assertStringContainsString('<li>First</li>', $html);
        $this->assertStringContainsString('</ol>', $html);
    }

    /**
     * Test: Code block is rendered with proper tags
     */
    public function testCodeBlockIsRendered()
    {
        $markdown = "```php\necho 'Hello';\n```";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<pre><code', $html);
        $this->assertStringContainsString("echo 'Hello';", $html);
        $this->assertStringContainsString('</code></pre>', $html);
    }

    /**
     * Test: Inline code is rendered
     */
    public function testInlineCodeIsRendered()
    {
        $markdown = "Use the `echo` command.";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<code>echo</code>', $html);
    }

    /**
     * Test: Links are rendered correctly
     */
    public function testLinksAreRendered()
    {
        $markdown = "[Google](https://google.com)";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<a href="https://google.com">Google</a>', $html);
    }

    /**
     * Test: Blockquotes are rendered
     */
    public function testBlockquotesAreRendered()
    {
        $markdown = "> This is a quote";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<blockquote>', $html);
        $this->assertStringContainsString('This is a quote', $html);
        $this->assertStringContainsString('</blockquote>', $html);
    }

    /**
     * Test: Horizontal rule is rendered
     */
    public function testHorizontalRuleIsRendered()
    {
        $markdown = "---";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<hr', $html);
    }

    /**
     * SECURITY TEST: Script tags are escaped by SafeMode
     */
    public function testScriptTagsAreEscaped()
    {
        $markdown = "<script>alert('XSS')</script>";
        $html = $this->parsedown->text($markdown);

        // Parsedown SafeMode should escape the script tag
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringNotContainsString('</script>', $html);

        // Should be escaped as HTML entities or removed
        // Parsedown escapes it to &lt;script&gt;
        $this->assertStringContainsString('&lt;script&gt;', $html);
    }

    /**
     * SECURITY TEST: Inline HTML is escaped by SafeMode
     */
    public function testInlineHtmlIsEscaped()
    {
        $markdown = "Hello <div onclick=\"alert('XSS')\">World</div>";
        $html = $this->parsedown->text($markdown);

        // Inline HTML should be escaped
        $this->assertStringNotContainsString('<div onclick=', $html);
        $this->assertStringNotContainsString('</div>', $html);
    }

    /**
     * SECURITY TEST: javascript: URLs in links are URL-encoded by Parsedown but still dangerous
     * (This requires additional sanitization in the API)
     */
    public function testJavascriptUrlInLinkIsRendered()
    {
        $markdown = "[Click me](javascript:alert('XSS'))";
        $html = $this->parsedown->text($markdown);

        // Parsedown URL-encodes javascript: to javascript%3A
        // This is still dangerous and needs to be sanitized!
        $this->assertTrue(
            strpos($html, 'javascript:') !== false || strpos($html, 'javascript%3A') !== false,
            'Parsedown should render javascript: URLs (either plain or URL-encoded)'
        );

        // This test documents that Parsedown alone is NOT sufficient for XSS prevention
        // Additional sanitization (removing javascript: URLs and variants) is required
    }

    /**
     * Test: Empty markdown returns empty HTML
     */
    public function testEmptyMarkdownReturnsEmptyHtml()
    {
        $markdown = "";
        $html = $this->parsedown->text($markdown);

        $this->assertEmpty($html);
    }

    /**
     * Test: Whitespace-only markdown returns empty HTML
     */
    public function testWhitespaceOnlyReturnsEmpty()
    {
        $markdown = "   \n\n   ";
        $html = $this->parsedown->text($markdown);

        $this->assertEmpty(trim($html));
    }

    /**
     * Test: Multiple headings with different levels
     */
    public function testMultipleHeadingLevels()
    {
        $markdown = "# H1\n## H2\n### H3";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<h1>H1</h1>', $html);
        $this->assertStringContainsString('<h2>H2</h2>', $html);
        $this->assertStringContainsString('<h3>H3</h3>', $html);
    }

    /**
     * Test: Nested lists are rendered
     */
    public function testNestedListsAreRendered()
    {
        $markdown = "- Parent\n  - Child 1\n  - Child 2";
        $html = $this->parsedown->text($markdown);

        $this->assertStringContainsString('<ul>', $html);
        $this->assertStringContainsString('<li>Parent', $html);
        $this->assertStringContainsString('<li>Child 1</li>', $html);
    }

    /**
     * Test: Complex markdown document with multiple elements
     */
    public function testComplexDocumentIsRendered()
    {
        $markdown = <<<'MD'
# Title

This is a paragraph with **bold** and *italic* text.

## Features

- Feature 1
- Feature 2
- Feature 3

Code example:

```php
echo "Hello World";
```

> Important note here.

[Link](https://example.com)
MD;

        $html = $this->parsedown->text($markdown);

        // Check all elements are present
        $this->assertStringContainsString('<h1>Title</h1>', $html);
        $this->assertStringContainsString('<strong>bold</strong>', $html);
        $this->assertStringContainsString('<em>italic</em>', $html);
        $this->assertStringContainsString('<h2>Features</h2>', $html);
        $this->assertStringContainsString('<ul>', $html);
        $this->assertStringContainsString('<pre><code', $html);
        $this->assertStringContainsString('Hello World', $html);
        $this->assertStringContainsString('<blockquote>', $html);
        $this->assertStringContainsString('<a href="https://example.com">Link</a>', $html);
    }
}
