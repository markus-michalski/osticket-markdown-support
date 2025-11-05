<?php

/**
 * Test suite for format field handling during ticket creation
 */

require_once __DIR__ . '/../../TicketFormatHandler.php';

use PHPUnit\Framework\TestCase;

class TicketCreationFormatTest extends TestCase
{
    /** @test */
    public function it_sets_format_to_markdown_when_explicitly_selected()
    {
        $data = ['message' => 'Test', 'format' => 'markdown'];
        $handler = new \TicketFormatHandler();
        
        $this->assertEquals('markdown', $handler->determineFormat($data));
    }

    /** @test */
    public function it_sets_format_to_html_when_explicitly_selected()
    {
        $data = ['message' => 'Test', 'format' => 'html'];
        $handler = new \TicketFormatHandler();
        
        $this->assertEquals('html', $handler->determineFormat($data));
    }

    /** @test */
    public function it_uses_default_format_from_config_when_not_set()
    {
        $data = ['message' => 'Plain text'];
        $config = ['default_format' => 'markdown'];
        $handler = new \TicketFormatHandler($config);
        
        $this->assertEquals('markdown', $handler->determineFormat($data));
    }

    /** @test */
    public function it_auto_detects_markdown_when_enabled_in_config()
    {
        $data = ['message' => '# Heading\n\nThis is **bold**.'];
        $config = [
            'auto_detect_markdown' => true,
            'default_format' => 'html',
            'auto_detect_threshold' => 5
        ];
        $handler = new \TicketFormatHandler($config);
        
        $this->assertEquals('markdown', $handler->determineFormat($data));
    }

    /** @test */
    public function it_does_not_auto_detect_when_disabled()
    {
        $data = ['message' => '# Heading\n\nThis is **bold**.'];
        $config = [
            'auto_detect_markdown' => false,
            'default_format' => 'html'
        ];
        $handler = new \TicketFormatHandler($config);
        
        $this->assertEquals('html', $handler->determineFormat($data));
    }

    /** @test */
    public function it_prioritizes_explicit_format_over_auto_detection()
    {
        $data = ['message' => '# Markdown', 'format' => 'html'];
        $config = ['auto_detect_markdown' => true];
        $handler = new \TicketFormatHandler($config);
        
        $this->assertEquals('html', $handler->determineFormat($data));
    }

    /** @test */
    public function it_handles_missing_message_field()
    {
        $data = ['format' => 'markdown'];
        $handler = new \TicketFormatHandler();
        
        $this->assertEquals('markdown', $handler->determineFormat($data));
    }

    /** @test */
    public function it_handles_empty_message()
    {
        $data = ['message' => '', 'format' => 'markdown'];
        $handler = new \TicketFormatHandler();
        
        $this->assertEquals('markdown', $handler->determineFormat($data));
    }

    /** @test */
    public function it_handles_api_ticket_creation_with_format()
    {
        $data = ['message' => 'API ticket', 'format' => 'markdown'];
        $handler = new \TicketFormatHandler();
        
        $this->assertEquals('markdown', $handler->determineFormat($data));
    }

    /** @test */
    public function it_auto_detects_format_for_api_tickets()
    {
        $data = ['message' => '## Bug\n\n- Issue 1\n- Issue 2'];
        $config = ['auto_detect_markdown' => true, 'auto_detect_threshold' => 5];
        $handler = new \TicketFormatHandler($config);
        
        $this->assertEquals('markdown', $handler->determineFormat($data));
    }

    /** @test */
    public function it_validates_format_values()
    {
        $data = ['message' => 'Test', 'format' => 'invalid'];
        $handler = new \TicketFormatHandler();
        
        // Invalid format should fallback to default
        $this->assertEquals('html', $handler->determineFormat($data));
    }
}
