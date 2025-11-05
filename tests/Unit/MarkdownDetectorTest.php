<?php

namespace MarkdownSupport\Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Test suite for Markdown syntax detection
 *
 * Tests the ability to auto-detect Markdown formatting in plain text,
 * which is critical for automatic format selection during ticket creation.
 */
class MarkdownDetectorTest extends TestCase
{
    private $detector;

    protected function setUp(): void
    {
        parent::setUp();
        // Load MarkdownDetector class
        require_once __DIR__ . '/../../MarkdownDetector.php';
        $this->detector = new \MarkdownDetector();
    }

    /**
     * @test
     * Detect Markdown headers (# Heading)
     */
    public function it_detects_markdown_headers()
    {
        $text = "# Main Heading\n## Sub Heading";

        $this->assertTrue($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Detect bold syntax (**text**)
     */
    public function it_detects_bold_syntax()
    {
        $text = "This is **bold text** in a sentence.";

        
        $this->assertTrue($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Detect italic syntax (*text*)
     */
    public function it_detects_italic_syntax()
    {
        $text = "This is *italic text* in a sentence.";

        
        $this->assertTrue($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Detect code blocks (```code```)
     */
    public function it_detects_code_blocks()
    {
        $text = "Example:\n```php\necho 'Hello';\n```";

        
        $this->assertTrue($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Detect inline code (`code`)
     */
    public function it_detects_inline_code()
    {
        $text = "Use the `printf()` function.";

        
        $this->assertTrue($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Detect unordered lists (- item)
     */
    public function it_detects_unordered_lists()
    {
        $text = "- Item 1\n- Item 2\n- Item 3";

        
        $this->assertTrue($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Detect ordered lists (1. item)
     */
    public function it_detects_ordered_lists()
    {
        $text = "1. First\n2. Second\n3. Third";

        
        $this->assertTrue($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Detect links ([text](url))
     */
    public function it_detects_markdown_links()
    {
        $text = "Check [this link](https://example.com) for more info.";

        
        $this->assertTrue($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Detect blockquotes (> text)
     */
    public function it_detects_blockquotes()
    {
        $text = "> This is a quote\n> from someone";

        
        $this->assertTrue($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Plain text should NOT be detected as Markdown
     */
    public function it_does_not_detect_plain_text_as_markdown()
    {
        $text = "This is just plain text without any special formatting.";

        
        $this->assertFalse($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * False positives: Email addresses should NOT trigger detection
     */
    public function it_ignores_email_addresses()
    {
        $text = "Contact me at user@example.com for details.";

        
        $this->assertFalse($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * False positives: Math expressions should NOT trigger detection
     */
    public function it_ignores_math_expressions()
    {
        $text = "The cost is 5*3 = 15 dollars.";

        
        $this->assertFalse($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Edge case: Empty string
     */
    public function it_handles_empty_string()
    {
        $text = "";

        
        $this->assertFalse($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Edge case: Only whitespace
     */
    public function it_handles_whitespace_only()
    {
        $text = "   \n\t  ";

        
        $this->assertFalse($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Mixed content: Markdown + plain text
     */
    public function it_detects_markdown_in_mixed_content()
    {
        $text = "Hello,\n\nHere are the **important** steps:\n\n1. First step\n2. Second step\n\nThanks!";

        
        $this->assertTrue($this->detector->hasMarkdownSyntax($text));
    }

    /**
     * @test
     * Get confidence score (0-100)
     */
    public function it_calculates_confidence_score()
    {
        $textWithManyMarkdownFeatures = "# Heading\n\n**Bold** and *italic*\n\n- List\n- Items\n\n```code```";
        $textWithFewMarkdownFeatures = "This is **bold** only.";
        $plainText = "No markdown here.";


        $this->assertGreaterThanOrEqual(50, $this->detector->getConfidenceScore($textWithManyMarkdownFeatures));
        $this->assertLessThan(50, $this->detector->getConfidenceScore($textWithFewMarkdownFeatures));
        $this->assertEquals(0, $this->detector->getConfidenceScore($plainText));
    }
}
