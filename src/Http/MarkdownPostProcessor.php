<?php

declare(strict_types=1);

namespace MarkdownSupport\Http;

/**
 * Pre-processes Markdown POST fields to HTML before osTicket handles them.
 *
 * Problem: osTicket uses raw $_POST['response'] for email templates.
 * The WYSIWYG editor sends HTML, so emails render correctly.
 * The Markdown editor sends plain text, so emails show raw syntax.
 *
 * Solution: Convert Markdown to HTML in $_POST before osTicket processes it,
 * then restore the original Markdown in the database after the full request
 * cycle (including email sending) via register_shutdown_function().
 *
 * Flow:
 * 1. preProcess(): Save originals, convert POST to HTML, register shutdown
 * 2. osTicket creates ThreadEntry (HTML) and sends email (HTML)
 * 3. recordEntryId(): Signal handler stores the created entry ID
 * 4. shutdown(): UPDATE DB entry back to Markdown + format='markdown'
 */
final class MarkdownPostProcessor
{
    /** @var array<string, string> Original Markdown content per field */
    private array $originals = [];

    /** @var int|null Thread entry ID to restore */
    private ?int $entryId = null;

    /** @var bool Whether pre-processing was applied */
    private bool $processed = false;

    /** @var string[] POST fields that may contain Markdown */
    private const MARKDOWN_FIELDS = ['response', 'note', 'message'];

    /**
     * Pre-process POST data: save originals, convert to HTML, register shutdown.
     *
     * Must be called AFTER extendCoreClasses() so MarkdownThreadEntryBody is available.
     */
    public function preProcess(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            return;
        }

        if (($this->getPostFormat()) !== 'markdown') {
            return;
        }

        if (!class_exists('MarkdownThreadEntryBody')) {
            return;
        }

        $converted = false;

        foreach (self::MARKDOWN_FIELDS as $field) {
            if (empty($_POST[$field])) {
                continue;
            }

            // Save original Markdown
            $this->originals[$field] = $_POST[$field];

            // Convert to HTML via MarkdownThreadEntryBody
            $html = (new \MarkdownThreadEntryBody($_POST[$field], []))->display();
            if ($html !== '') {
                $_POST[$field] = $html;
                $converted = true;
            }
        }

        if (!$converted) {
            return;
        }

        // Switch format so osTicket treats content as HTML
        $_POST['format'] = 'html';
        $this->processed = true;

        // Register shutdown to restore Markdown after email is sent
        register_shutdown_function([$this, 'restoreMarkdownInDatabase']);
    }

    /**
     * Record the thread entry ID for later DB restoration.
     *
     * Called from the threadentry.created signal handler.
     */
    public function recordEntryId(int $entryId): void
    {
        if ($this->processed) {
            $this->entryId = $entryId;
        }
    }

    /**
     * Whether pre-processing was applied this request.
     */
    public function wasProcessed(): bool
    {
        return $this->processed;
    }

    /**
     * Get the original Markdown content for a field.
     */
    public function getOriginal(string $field): ?string
    {
        return $this->originals[$field] ?? null;
    }

    /**
     * Restore original Markdown in the database (called via shutdown function).
     *
     * Runs after ALL PHP processing including email sending.
     * Updates the thread entry back to Markdown content + format='markdown'.
     */
    public function restoreMarkdownInDatabase(): void
    {
        if (!$this->processed || $this->entryId === null) {
            return;
        }

        if (!defined('THREAD_ENTRY_TABLE') || !function_exists('db_input') || !function_exists('db_query')) {
            return;
        }

        // Find the original Markdown body (first non-empty field)
        $markdownBody = $this->getOriginalBody();
        if ($markdownBody === null) {
            return;
        }

        $sql = 'UPDATE ' . THREAD_ENTRY_TABLE
            . ' SET body = ' . db_input($markdownBody)
            . ', format = ' . db_input('markdown')
            . ' WHERE id = ' . db_input((string) $this->entryId);

        if (!db_query($sql)) {
            error_log(sprintf(
                '[Markdown-Support] Failed to restore Markdown for entry %d: %s',
                $this->entryId,
                function_exists('db_error') ? db_error() : 'unknown'
            ));
        }
    }

    /**
     * Get the POST format value.
     */
    private function getPostFormat(): string
    {
        return strtolower(trim($_POST['format'] ?? ''));
    }

    /**
     * Get the first original Markdown body that was saved.
     */
    private function getOriginalBody(): ?string
    {
        foreach (self::MARKDOWN_FIELDS as $field) {
            if (isset($this->originals[$field]) && $this->originals[$field] !== '') {
                return $this->originals[$field];
            }
        }

        return null;
    }
}
