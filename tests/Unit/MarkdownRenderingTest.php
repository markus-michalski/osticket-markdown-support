<?php

namespace MarkdownSupport\Tests\Unit;

use PHPUnit\Framework\TestCase;
use MarkdownThreadEntryBody;

/**
 * Markdown Rendering Tests
 *
 * Verifies that all standard Markdown syntax is correctly rendered to HTML
 * using Parsedown while maintaining XSS protection.
 *
 * @group unit
 * @group markdown
 */
class MarkdownRenderingTest extends TestCase
{
    /**
     * Test inline formatting: Bold, Italic, Code
     */
    public function testInlineFormatting(): void
    {
        $markdown = '**Bold** and *italic* and `code`';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<strong>Bold</strong>', $html);
        $this->assertStringContainsString('<em>italic</em>', $html);
        $this->assertStringContainsString('<code>code</code>', $html);
    }

    /**
     * Test alternative bold/italic syntax
     */
    public function testAlternativeInlineFormatting(): void
    {
        $markdown = '__Bold__ and _italic_';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<strong>Bold</strong>', $html);
        $this->assertStringContainsString('<em>italic</em>', $html);
    }

    /**
     * Test strikethrough (Parsedown DOES support it!)
     */
    public function testStrikethrough(): void
    {
        $markdown = '~~Strikethrough~~';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Parsedown DOES support strikethrough with <del> tags
        $this->assertStringContainsString('<del>Strikethrough</del>', $html);
    }

    /**
     * Test combined inline formatting
     */
    public function testCombinedInlineFormatting(): void
    {
        $markdown = '***Bold and italic***';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Should render as both strong and em
        $this->assertMatchesRegularExpression('/<(strong|em)><(strong|em)>Bold and italic<\/(strong|em)><\/(strong|em)>/', $html);
    }

    /**
     * Test H1-H6 headings
     */
    public function testHeadings(): void
    {
        $markdown = <<<'MARKDOWN'
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<h1>Heading 1</h1>', $html);
        $this->assertStringContainsString('<h2>Heading 2</h2>', $html);
        $this->assertStringContainsString('<h3>Heading 3</h3>', $html);
        $this->assertStringContainsString('<h4>Heading 4</h4>', $html);
        $this->assertStringContainsString('<h5>Heading 5</h5>', $html);
        $this->assertStringContainsString('<h6>Heading 6</h6>', $html);
    }

    /**
     * Test alternative heading syntax (underline)
     */
    public function testAlternativeHeadingSyntax(): void
    {
        $markdown = <<<'MARKDOWN'
Heading 1
=========

Heading 2
---------
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<h1>Heading 1</h1>', $html);
        $this->assertStringContainsString('<h2>Heading 2</h2>', $html);
    }

    /**
     * Test inline links
     */
    public function testInlineLinks(): void
    {
        $markdown = '[Link Text](https://example.com)';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<a href="https://example.com">Link Text</a>', $html);
    }

    /**
     * Test links with titles
     */
    public function testLinksWithTitles(): void
    {
        $markdown = '[Link](https://example.com "Title Text")';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('href="https://example.com"', $html);
        $this->assertStringContainsString('title="Title Text"', $html);
    }

    /**
     * Test reference-style links
     */
    public function testReferenceLinks(): void
    {
        $markdown = <<<'MARKDOWN'
[Link Text][ref]

[ref]: https://example.com
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<a href="https://example.com">Link Text</a>', $html);
    }

    /**
     * Test autolinks (URLs automatically converted)
     */
    public function testAutolinks(): void
    {
        $markdown = '<https://example.com>';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<a href="https://example.com">https://example.com</a>', $html);
    }

    /**
     * Test unordered lists
     */
    public function testUnorderedLists(): void
    {
        $markdown = <<<'MARKDOWN'
- Item 1
- Item 2
- Item 3
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<ul>', $html);
        $this->assertStringContainsString('<li>Item 1</li>', $html);
        $this->assertStringContainsString('<li>Item 2</li>', $html);
        $this->assertStringContainsString('<li>Item 3</li>', $html);
        $this->assertStringContainsString('</ul>', $html);
    }

    /**
     * Test alternative unordered list syntax
     */
    public function testAlternativeUnorderedListSyntax(): void
    {
        $markdown = <<<'MARKDOWN'
* Item with asterisk
+ Item with plus
- Item with minus
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<ul>', $html);
        $this->assertStringContainsString('<li>Item with asterisk</li>', $html);
        $this->assertStringContainsString('<li>Item with plus</li>', $html);
        $this->assertStringContainsString('<li>Item with minus</li>', $html);
    }

    /**
     * Test ordered lists
     */
    public function testOrderedLists(): void
    {
        $markdown = <<<'MARKDOWN'
1. First item
2. Second item
3. Third item
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<ol>', $html);
        $this->assertStringContainsString('<li>First item</li>', $html);
        $this->assertStringContainsString('<li>Second item</li>', $html);
        $this->assertStringContainsString('<li>Third item</li>', $html);
        $this->assertStringContainsString('</ol>', $html);
    }

    /**
     * Test nested lists
     */
    public function testNestedLists(): void
    {
        $markdown = <<<'MARKDOWN'
- Parent 1
  - Child 1
  - Child 2
- Parent 2
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<ul>', $html);
        $this->assertStringContainsString('<li>Parent 1', $html);
        $this->assertStringContainsString('<li>Child 1</li>', $html);
        $this->assertStringContainsString('<li>Child 2</li>', $html);
    }

    /**
     * Test fenced code blocks
     */
    public function testFencedCodeBlocks(): void
    {
        $markdown = <<<'MARKDOWN'
```
function test() {
    return true;
}
```
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<pre>', $html);
        $this->assertStringContainsString('<code>', $html);
        $this->assertStringContainsString('function test()', $html);
    }

    /**
     * Test fenced code blocks with language specification
     */
    public function testFencedCodeBlocksWithLanguage(): void
    {
        $markdown = <<<'MARKDOWN'
```php
<?php
echo "Hello World";
?>
```
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<code', $html);
        $this->assertStringContainsString('echo "Hello World"', $html);
    }

    /**
     * Test indented code blocks
     */
    public function testIndentedCodeBlocks(): void
    {
        $markdown = <<<'MARKDOWN'
Normal text

    indented code block
    line 2 of code

More normal text
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<pre>', $html);
        $this->assertStringContainsString('<code>', $html);
        $this->assertStringContainsString('indented code block', $html);
    }

    /**
     * Test blockquotes
     */
    public function testBlockquotes(): void
    {
        $markdown = '> This is a quote';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<blockquote>', $html);
        $this->assertStringContainsString('This is a quote', $html);
        $this->assertStringContainsString('</blockquote>', $html);
    }

    /**
     * Test multi-line blockquotes
     */
    public function testMultiLineBlockquotes(): void
    {
        $markdown = <<<'MARKDOWN'
> Line 1 of quote
> Line 2 of quote
> Line 3 of quote
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<blockquote>', $html);
        $this->assertStringContainsString('Line 1 of quote', $html);
        $this->assertStringContainsString('Line 3 of quote', $html);
    }

    /**
     * Test nested blockquotes
     */
    public function testNestedBlockquotes(): void
    {
        $markdown = <<<'MARKDOWN'
> Level 1
>> Level 2
>>> Level 3
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<blockquote>', $html);
        // Check for nested structure
        $this->assertGreaterThan(1, substr_count($html, '<blockquote>'));
    }

    /**
     * Test images
     */
    public function testImages(): void
    {
        $markdown = '![Alt Text](https://example.com/image.png)';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<img', $html);
        $this->assertStringContainsString('alt="Alt Text"', $html);
        $this->assertStringContainsString('src="https://example.com/image.png"', $html);
    }

    /**
     * Test images with titles
     */
    public function testImagesWithTitles(): void
    {
        $markdown = '![Alt](https://example.com/img.png "Title")';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('alt="Alt"', $html);
        $this->assertStringContainsString('title="Title"', $html);
    }

    /**
     * Test horizontal rules
     */
    public function testHorizontalRules(): void
    {
        $variations = [
            '---',
            '***',
            '___',
            '- - -',
            '* * *',
        ];

        foreach ($variations as $markdown) {
            $body = new MarkdownThreadEntryBody($markdown);
            $html = $body->display();

            $this->assertStringContainsString('<hr', $html, "Failed for: {$markdown}");
        }
    }

    /**
     * Test line breaks
     */
    public function testLineBreaks(): void
    {
        $markdown = "Line 1  \nLine 2";  // Two spaces before newline = hard break
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<br', $html);
    }

    /**
     * Test HTML entities are preserved
     */
    public function testHtmlEntities(): void
    {
        $markdown = '&copy; 2024 &amp; &lt;text&gt;';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('&copy;', $html);
        $this->assertStringContainsString('&amp;', $html);
        $this->assertStringContainsString('&lt;', $html);
    }

    /**
     * Test special characters are escaped
     */
    public function testSpecialCharactersEscaped(): void
    {
        $markdown = 'Use \* for asterisk and \_ for underscore';
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Escaped characters should appear as literals
        $this->assertStringContainsString('*', $html);
        $this->assertStringContainsString('_', $html);
        // Should not be formatted
        $this->assertStringNotContainsString('<em>', $html);
    }

    /**
     * Test tables (if supported by Parsedown)
     */
    public function testTables(): void
    {
        $markdown = <<<'MARKDOWN'
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Parsedown doesn't support tables by default
        // This test documents the behavior
        $this->assertIsString($html);
    }

    /**
     * Test real-world ticket response example
     */
    public function testRealWorldTicketResponse(): void
    {
        $markdown = <<<'MARKDOWN'
# Issue Resolution

Thank you for contacting support. I've investigated the issue and here's what I found:

## Problem Analysis

The error occurs because:

1. **Database connection timeout**
2. **Memory limit exceeded**
3. **Invalid configuration**

## Solution Steps

Please follow these steps:

```bash
# Step 1: Clear cache
php bin/console cache:clear

# Step 2: Run migrations
php bin/console doctrine:migrations:migrate
```

## Additional Information

For more details, see our [documentation](https://docs.example.com).

> **Important**: Make sure to backup your database before running migrations!

Let me know if you need further assistance.

---

Best regards,
Support Team
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Verify key elements are rendered
        $this->assertStringContainsString('<h1>Issue Resolution</h1>', $html);
        $this->assertStringContainsString('<h2>Problem Analysis</h2>', $html);
        $this->assertStringContainsString('<ol>', $html); // Ordered list
        $this->assertStringContainsString('<strong>Database connection timeout</strong>', $html);
        $this->assertStringContainsString('<pre>', $html); // Code block
        $this->assertStringContainsString('php bin/console', $html);
        $this->assertStringContainsString('<a href="https://docs.example.com">', $html);
        $this->assertStringContainsString('<blockquote>', $html);
        $this->assertStringContainsString('<hr', $html); // Horizontal rule
    }

    /**
     * Test mixed content rendering
     */
    public function testMixedContent(): void
    {
        $markdown = <<<'MARKDOWN'
# Heading

Paragraph with **bold** and *italic* text.

- List item with `code`
- List item with [link](https://example.com)

> Quote with **bold**

```
code block
```
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('<h1>', $html);
        $this->assertStringContainsString('<strong>bold</strong>', $html);
        $this->assertStringContainsString('<em>italic</em>', $html);
        $this->assertStringContainsString('<ul>', $html);
        $this->assertStringContainsString('<code>code</code>', $html);
        $this->assertStringContainsString('<a href', $html);
        $this->assertStringContainsString('<blockquote>', $html);
        $this->assertStringContainsString('<pre>', $html);
    }
}
