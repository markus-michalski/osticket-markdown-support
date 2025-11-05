<?php

namespace MarkdownSupport\Tests\Unit;

use PHPUnit\Framework\TestCase;
use MarkdownThreadEntryBody;

/**
 * Edge Cases and Robustness Tests
 *
 * Tests edge cases, extreme inputs, and error handling to ensure
 * the Markdown renderer is robust and doesn't crash on unusual input.
 *
 * @group unit
 * @group edge-cases
 */
class EdgeCasesTest extends TestCase
{
    /**
     * Test NULL input
     */
    public function testNullInput(): void
    {
        $body = new MarkdownThreadEntryBody(null);
        $html = $body->display();

        $this->assertSame('', $html);
        $this->assertTrue($body->isEmpty());
    }

    /**
     * Test empty string input
     */
    public function testEmptyStringInput(): void
    {
        $body = new MarkdownThreadEntryBody('');
        $html = $body->display();

        $this->assertSame('', $html);
        $this->assertTrue($body->isEmpty());
    }

    /**
     * Test whitespace-only input
     */
    public function testWhitespaceOnlyInput(): void
    {
        $inputs = [
            ' ',
            '   ',
            "\t",
            "\n",
            "\r\n",
            "   \n\n   ",
        ];

        foreach ($inputs as $input) {
            $body = new MarkdownThreadEntryBody($input);
            $this->assertTrue($body->isEmpty(), "Failed for whitespace: " . json_encode($input));
        }
    }

    /**
     * Test very long content (performance test)
     */
    public function testVeryLongContent(): void
    {
        // Generate 10,000 lines of Markdown
        $lines = [];
        for ($i = 1; $i <= 10000; $i++) {
            $lines[] = "Line {$i} with **bold** and *italic* text";
        }
        $markdown = implode("\n", $lines);

        $startTime = microtime(true);
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();
        $endTime = microtime(true);

        $executionTime = $endTime - $startTime;

        // Should complete in reasonable time (< 5 seconds)
        $this->assertLessThan(5, $executionTime,
            "Rendering 10,000 lines took {$executionTime}s (should be < 5s)");

        // Verify content was rendered
        $this->assertStringContainsString('Line 1', $html);
        $this->assertStringContainsString('Line 10000', $html);
        $this->assertStringContainsString('<strong>bold</strong>', $html);
    }

    /**
     * Test deep nesting (prevent stack overflow)
     */
    public function testDeepNesting(): void
    {
        // Create deeply nested blockquotes (50 levels)
        $markdown = str_repeat('> ', 50) . 'Deeply nested text';

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Should not crash, should contain nested blockquotes
        $this->assertStringContainsString('<blockquote>', $html);
        $this->assertStringContainsString('Deeply nested text', $html);

        // Should have multiple blockquote tags
        $blockquoteCount = substr_count($html, '<blockquote>');
        $this->assertGreaterThan(1, $blockquoteCount);
    }

    /**
     * Test very long line (no newlines)
     */
    public function testVeryLongLine(): void
    {
        // 50,000 character single line
        $markdown = str_repeat('a', 50000);

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Should not crash
        $this->assertIsString($html);
        $this->assertStringContainsString('aaaa', $html);
    }

    /**
     * Test UTF-8 multibyte characters
     */
    public function testUtf8MultibbyteCharacters(): void
    {
        $markdown = <<<'MARKDOWN'
# 中文标题

**日本語テキスト** und deutsche Umlaute: äöüÄÖÜß

Emojis: 😀 🎉 🚀 ✅

Arabic: مرحبا بك

Greek: Γειά σου

Russian: Привет
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Verify UTF-8 characters are preserved
        $this->assertStringContainsString('中文标题', $html);
        $this->assertStringContainsString('日本語テキスト', $html);
        $this->assertStringContainsString('äöüÄÖÜß', $html);
        $this->assertStringContainsString('😀', $html);
        $this->assertStringContainsString('مرحبا', $html);
        $this->assertStringContainsString('Γειά', $html);
        $this->assertStringContainsString('Привет', $html);
    }

    /**
     * Test emojis in various contexts
     */
    public function testEmojis(): void
    {
        $markdown = <<<'MARKDOWN'
# Heading with emoji 🚀

**Bold emoji 💪** and *italic emoji 🎯*

[Link with emoji 🔗](https://example.com)

> Quote with emoji 💬

- List item 📝
- Another item ✅
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('🚀', $html);
        $this->assertStringContainsString('💪', $html);
        $this->assertStringContainsString('🎯', $html);
        $this->assertStringContainsString('🔗', $html);
        $this->assertStringContainsString('💬', $html);
        $this->assertStringContainsString('📝', $html);
        $this->assertStringContainsString('✅', $html);
    }

    /**
     * Test invalid UTF-8 sequences (graceful handling)
     */
    public function testInvalidUtf8(): void
    {
        // Invalid UTF-8 byte sequence
        $markdown = "Valid text \xC3\x28 invalid UTF-8";

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Should not crash, should produce some output
        $this->assertIsString($html);
        $this->assertStringContainsString('Valid text', $html);
    }

    /**
     * Test mixed line endings (Windows, Unix, Mac)
     */
    public function testMixedLineEndings(): void
    {
        // Mix of \r\n (Windows), \n (Unix), \r (old Mac)
        $markdown = "Line 1\r\nLine 2\nLine 3\rLine 4";

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // All lines should be present
        $this->assertStringContainsString('Line 1', $html);
        $this->assertStringContainsString('Line 2', $html);
        $this->assertStringContainsString('Line 3', $html);
        $this->assertStringContainsString('Line 4', $html);
    }

    /**
     * Test malformed Markdown (unclosed tags)
     */
    public function testMalformedMarkdown(): void
    {
        $inputs = [
            '**Unclosed bold',
            '*Unclosed italic',
            '[Unclosed link(https://example.com)',
            '`Unclosed code',
        ];

        foreach ($inputs as $markdown) {
            $body = new MarkdownThreadEntryBody($markdown);
            $html = $body->display();

            // Should not crash
            $this->assertIsString($html, "Failed for: {$markdown}");
        }
    }

    /**
     * Test output modes: html, email, pdf
     */
    public function testOutputModes(): void
    {
        $markdown = '# Heading\n\n**Bold** text with ![Image](https://example.com/img.png)';

        $body = new MarkdownThreadEntryBody($markdown);

        // Test HTML mode (default)
        $htmlOutput = $body->display('html');
        $this->assertStringContainsString('<h1>Heading', $htmlOutput); // May have newlines
        $this->assertStringContainsString('</h1>', $htmlOutput);
        $this->assertStringContainsString('<img', $htmlOutput);

        // Test email mode
        $emailOutput = $body->display('email');
        $this->assertStringContainsString('<h1>Heading', $emailOutput);
        $this->assertIsString($emailOutput);

        // Test PDF mode (should strip external images)
        $pdfOutput = $body->display('pdf');
        $this->assertStringContainsString('<h1>Heading', $pdfOutput);
        $this->assertStringNotContainsString('https://example.com/img.png', $pdfOutput,
            'PDF mode should strip external image URLs');
    }

    /**
     * Test toHtml() method
     */
    public function testToHtmlMethod(): void
    {
        $markdown = '**Bold** text';
        $body = new MarkdownThreadEntryBody($markdown);

        $html = $body->toHtml();

        $this->assertStringContainsString('<strong>Bold</strong>', $html);
    }

    /**
     * Test getSearchable() method (converts to plain text)
     */
    public function testGetSearchableMethod(): void
    {
        $markdown = <<<'MARKDOWN'
# Heading

**Bold** and *italic* text with [link](https://example.com)

```
code block
```
MARKDOWN;

        $body = new MarkdownThreadEntryBody($markdown);
        $searchable = $body->getSearchable();

        // Should be plain text without HTML tags
        $this->assertStringNotContainsString('<h1>', $searchable);
        $this->assertStringNotContainsString('<strong>', $searchable);
        $this->assertStringNotContainsString('<em>', $searchable);

        // Should contain text content
        $this->assertStringContainsString('Heading', $searchable);
        $this->assertStringContainsString('Bold', $searchable);
        $this->assertStringContainsString('italic', $searchable);
    }

    /**
     * Test isEmpty() method
     */
    public function testIsEmptyMethod(): void
    {
        // Empty inputs
        $this->assertTrue((new MarkdownThreadEntryBody(''))->isEmpty());
        $this->assertTrue((new MarkdownThreadEntryBody('   '))->isEmpty());
        $this->assertTrue((new MarkdownThreadEntryBody("\n\n"))->isEmpty());

        // Non-empty inputs
        $this->assertFalse((new MarkdownThreadEntryBody('text'))->isEmpty());
        $this->assertFalse((new MarkdownThreadEntryBody('  text  '))->isEmpty());
    }

    /**
     * Test getClean() method
     */
    public function testGetCleanMethod(): void
    {
        $markdown = '**Bold** text';
        $body = new MarkdownThreadEntryBody($markdown);

        $clean = $body->getClean();

        $this->assertStringContainsString('<strong>Bold</strong>', $clean);
    }

    /**
     * Test getOriginal() method (returns raw Markdown)
     */
    public function testGetOriginalMethod(): void
    {
        $markdown = '**Bold** text';
        $body = new MarkdownThreadEntryBody($markdown);

        $original = $body->getOriginal();

        // Should return raw Markdown, not HTML
        $this->assertSame('**Bold** text', $original);
        $this->assertStringNotContainsString('<strong>', $original);
    }

    /**
     * Test getType() method
     */
    public function testGetTypeMethod(): void
    {
        $body = new MarkdownThreadEntryBody('test');

        $this->assertSame('markdown', $body->getType());
    }

    /**
     * Test special Markdown characters in text
     */
    public function testSpecialMarkdownCharacters(): void
    {
        $markdown = 'Asterisks: * and ** and *** | Underscores: _ and __ | Backticks: ` and ```';

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Should handle special characters gracefully
        $this->assertIsString($html);
    }

    /**
     * Test consecutive blank lines
     */
    public function testConsecutiveBlankLines(): void
    {
        $markdown = "Line 1\n\n\n\n\nLine 2";

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('Line 1', $html);
        $this->assertStringContainsString('Line 2', $html);
    }

    /**
     * Test Markdown with only whitespace between markers
     */
    public function testMarkdownWithOnlyWhitespace(): void
    {
        $inputs = [
            '**  **',
            '*  *',
            '__  __',
            '_  _',
        ];

        foreach ($inputs as $markdown) {
            $body = new MarkdownThreadEntryBody($markdown);
            $html = $body->display();

            // Should not crash
            $this->assertIsString($html);
        }
    }

    /**
     * Test numeric-only content
     */
    public function testNumericOnlyContent(): void
    {
        $markdown = '123456789';

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertStringContainsString('123456789', $html);
    }

    /**
     * Test special symbols and punctuation
     */
    public function testSpecialSymbolsAndPunctuation(): void
    {
        $markdown = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Should handle special characters without crashing
        $this->assertIsString($html);
    }

    /**
     * Test very long words (no spaces)
     */
    public function testVeryLongWords(): void
    {
        // 1000-character word
        $markdown = str_repeat('supercalifragilisticexpialidocious', 30);

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        $this->assertIsString($html);
        $this->assertStringContainsString('supercalifragilistic', $html);
    }

    /**
     * Test performance with many formatting markers
     */
    public function testManyFormattingMarkers(): void
    {
        // 1000 bold markers
        $parts = [];
        for ($i = 0; $i < 1000; $i++) {
            $parts[] = "**bold{$i}**";
        }
        $markdown = implode(' ', $parts);

        $startTime = microtime(true);
        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();
        $endTime = microtime(true);

        $executionTime = $endTime - $startTime;

        // Should complete in reasonable time (< 2 seconds)
        $this->assertLessThan(2, $executionTime,
            "Rendering 1000 bold markers took {$executionTime}s (should be < 2s)");

        $this->assertStringContainsString('<strong>bold0</strong>', $html);
        $this->assertStringContainsString('<strong>bold999</strong>', $html);
    }

    /**
     * Test NULL bytes in input (security concern)
     */
    public function testNullBytesInInput(): void
    {
        $markdown = "Text\x00with\x00null\x00bytes";

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Should handle gracefully without crashing
        $this->assertIsString($html);
    }

    /**
     * Test binary data input (should handle gracefully)
     */
    public function testBinaryDataInput(): void
    {
        // Random binary data
        $markdown = "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR";

        $body = new MarkdownThreadEntryBody($markdown);
        $html = $body->display();

        // Should not crash
        $this->assertIsString($html);
    }

    /**
     * Test constructor with options array
     */
    public function testConstructorWithOptions(): void
    {
        $options = ['some_option' => 'value'];
        $body = new MarkdownThreadEntryBody('**text**', $options);

        // Should not crash and should render
        $html = $body->display();
        $this->assertStringContainsString('<strong>text</strong>', $html);
    }
}
