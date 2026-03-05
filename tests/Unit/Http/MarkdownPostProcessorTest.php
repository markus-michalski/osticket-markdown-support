<?php

declare(strict_types=1);

namespace MarkdownSupport\Tests\Unit\Http;

use MarkdownSupport\Http\MarkdownPostProcessor;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MarkdownSupport\Http\MarkdownPostProcessor
 */
final class MarkdownPostProcessorTest extends TestCase
{
    private MarkdownPostProcessor $processor;

    /** @var array<string, mixed> */
    private array $originalPost;

    /** @var array<string, mixed> */
    private array $originalServer;

    protected function setUp(): void
    {
        $this->processor = new MarkdownPostProcessor();
        $this->originalPost = $_POST;
        $this->originalServer = $_SERVER;
    }

    protected function tearDown(): void
    {
        $_POST = $this->originalPost;
        $_SERVER = $this->originalServer;
    }

    public function testSkipsNonPostRequests(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_POST['format'] = 'markdown';
        $_POST['response'] = '**bold**';

        $this->processor->preProcess();

        self::assertFalse($this->processor->wasProcessed());
        self::assertSame('**bold**', $_POST['response']);
    }

    public function testSkipsNonMarkdownFormat(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'html';
        $_POST['response'] = '<b>bold</b>';

        $this->processor->preProcess();

        self::assertFalse($this->processor->wasProcessed());
        self::assertSame('<b>bold</b>', $_POST['response']);
    }

    public function testSkipsWhenFormatMissing(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        unset($_POST['format']);
        $_POST['response'] = '**bold**';

        $this->processor->preProcess();

        self::assertFalse($this->processor->wasProcessed());
    }

    public function testConvertsResponseFieldToHtml(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'markdown';
        $_POST['response'] = '**bold text**';

        $this->processor->preProcess();

        self::assertTrue($this->processor->wasProcessed());
        self::assertStringContainsString('<strong>bold text</strong>', $_POST['response']);
        self::assertSame('html', $_POST['format']);
    }

    public function testConvertsNoteFieldToHtml(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'markdown';
        $_POST['note'] = '# Heading';

        $this->processor->preProcess();

        self::assertTrue($this->processor->wasProcessed());
        self::assertStringContainsString('<h1>Heading</h1>', $_POST['note']);
    }

    public function testConvertsMessageFieldToHtml(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'markdown';
        $_POST['message'] = '**bold**';

        $this->processor->preProcess();

        self::assertTrue($this->processor->wasProcessed());
        self::assertSame('html', $_POST['format']);
    }

    public function testPreservesOriginalMarkdown(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'markdown';
        $_POST['response'] = '**bold text**';

        $this->processor->preProcess();

        self::assertSame('**bold text**', $this->processor->getOriginal('response'));
    }

    public function testReturnsNullForUnprocessedField(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'markdown';
        $_POST['response'] = '**bold**';

        $this->processor->preProcess();

        self::assertNull($this->processor->getOriginal('note'));
    }

    public function testRecordEntryIdIgnoredWhenNotProcessed(): void
    {
        $this->processor->recordEntryId(42);
        self::assertFalse($this->processor->wasProcessed());
    }

    public function testRecordEntryIdAfterProcessing(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'markdown';
        $_POST['response'] = '**bold**';

        $this->processor->preProcess();
        $this->processor->recordEntryId(42);

        self::assertTrue($this->processor->wasProcessed());
    }

    public function testRestoreSkipsWithoutEntryId(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'markdown';
        $_POST['response'] = '**bold**';

        $this->processor->preProcess();
        // Don't record entry ID — restore should be no-op
        $this->processor->restoreMarkdownInDatabase();

        self::assertTrue($this->processor->wasProcessed());
    }

    public function testRestoreSkipsWithoutProcessing(): void
    {
        $this->processor->restoreMarkdownInDatabase();
        self::assertFalse($this->processor->wasProcessed());
    }

    public function testSkipsEmptyFields(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'markdown';
        $_POST['response'] = '';
        $_POST['note'] = '**bold**';

        $this->processor->preProcess();

        self::assertTrue($this->processor->wasProcessed());
        self::assertNull($this->processor->getOriginal('response'));
        self::assertSame('**bold**', $this->processor->getOriginal('note'));
    }

    public function testHandlesCaseInsensitiveFormat(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'Markdown';
        $_POST['response'] = '**bold**';

        $this->processor->preProcess();

        self::assertTrue($this->processor->wasProcessed());
    }

    public function testHandlesFormatWithWhitespace(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = '  markdown  ';
        $_POST['response'] = '**bold**';

        $this->processor->preProcess();

        self::assertTrue($this->processor->wasProcessed());
    }

    public function testMultipleFieldsProcessed(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_POST['format'] = 'markdown';
        $_POST['response'] = '**response**';
        $_POST['note'] = '*note*';

        $this->processor->preProcess();

        self::assertTrue($this->processor->wasProcessed());
        self::assertSame('**response**', $this->processor->getOriginal('response'));
        self::assertSame('*note*', $this->processor->getOriginal('note'));
        self::assertStringContainsString('<strong>response</strong>', $_POST['response']);
        self::assertStringContainsString('<em>note</em>', $_POST['note']);
    }
}
