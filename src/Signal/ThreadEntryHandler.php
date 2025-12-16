<?php

declare(strict_types=1);

namespace MarkdownSupport\Signal;

use MarkdownSupport\Config\ConfigCache;

/**
 * ThreadEntryHandler - Handles thread entry creation signals
 *
 * Responsible for:
 * - Format detection and correction
 * - Newline restoration (osTicket strips them during save)
 * - Auto-conversion to Markdown (when enabled)
 *
 * @package MarkdownSupport
 */
final class ThreadEntryHandler
{
    private ConfigCache $configCache;
    /** @var object|null Markdown detector with hasMarkdownSyntax() method */
    private ?object $detector;

    /**
     * @param ConfigCache $configCache
     * @param object|null $detector Object with hasMarkdownSyntax($text, $threshold) method
     */
    public function __construct(ConfigCache $configCache, ?object $detector = null)
    {
        $this->configCache = $configCache;
        $this->detector = $detector;
    }

    /**
     * Handle threadentry.created signal
     *
     * @param object $entry ThreadEntry object
     */
    public function onThreadEntryCreated(object $entry): void
    {
        // Restore newlines if they were stripped
        $this->restoreNewlines($entry);

        // Detect and set format
        $format = $this->detectFormat();

        if ($format !== null) {
            $this->updateEntryFormat($entry, $format);
        }

        // Auto-convert to Markdown if enabled
        if ($this->shouldAutoConvert($entry)) {
            $this->autoConvertToMarkdown($entry);
        }
    }

    /**
     * Restore newlines that get stripped during osTicket's save process
     */
    private function restoreNewlines(object $entry): void
    {
        $body = $this->getEntryBody($entry);
        $postBody = $this->getPostBody();

        if ($postBody === null) {
            return;
        }

        // If newlines are in POST but not in saved entry, restore them
        if (strpos($postBody, "\n") !== false && strpos($body, "\n") === false) {
            $this->updateEntryBody($entry, $postBody);
        }
    }

    /**
     * Detect format from request data
     *
     * @return string|null Format if detected, null otherwise
     */
    private function detectFormat(): ?string
    {
        // Check POST data first
        if (isset($_POST['format']) && $_POST['format'] !== '') {
            return $this->validateFormat($_POST['format']);
        }

        // Check JSON body for API requests
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            $jsonInput = file_get_contents('php://input');
            if ($jsonInput !== false) {
                $data = json_decode($jsonInput, true);
                if (isset($data['format']) && $data['format'] !== '') {
                    return $this->validateFormat($data['format']);
                }
            }
        }

        return null;
    }

    /**
     * Check if auto-conversion should be applied
     */
    private function shouldAutoConvert(object $entry): bool
    {
        // Only if enabled in config
        if (!$this->configCache->get('auto_convert_to_markdown', false)) {
            return false;
        }

        // Only if format was not explicitly set
        if (isset($_POST['format']) && $_POST['format'] !== '') {
            return false;
        }

        return true;
    }

    /**
     * Auto-convert entry to Markdown if content contains Markdown syntax
     */
    private function autoConvertToMarkdown(object $entry): void
    {
        if ($this->detector === null) {
            return;
        }

        $postBody = $this->getPostBody();
        if ($postBody === null) {
            return;
        }

        $threshold = (int) $this->configCache->get('auto_detect_threshold', 5);

        if ($this->detector->hasMarkdownSyntax($postBody, $threshold)) {
            $this->updateEntryFormat($entry, 'markdown');
        }
    }

    /**
     * Get body content from POST data
     */
    private function getPostBody(): ?string
    {
        $fields = ['response', 'note', 'message', 'body'];

        foreach ($fields as $field) {
            if (isset($_POST[$field]) && $_POST[$field] !== '') {
                return $_POST[$field];
            }
        }

        return null;
    }

    /**
     * Get entry body via reflection or method call
     */
    private function getEntryBody(object $entry): string
    {
        if (method_exists($entry, 'getBody')) {
            return (string) $entry->getBody();
        }

        return '';
    }

    /**
     * Update entry body in database
     */
    private function updateEntryBody(object $entry, string $body): void
    {
        if (!defined('THREAD_ENTRY_TABLE') || !function_exists('db_input') || !function_exists('db_query')) {
            return;
        }

        $entryId = $this->getEntryId($entry);
        if ($entryId === null) {
            return;
        }

        $sql = 'UPDATE ' . THREAD_ENTRY_TABLE
            . ' SET body = ' . db_input($body)
            . ' WHERE id = ' . db_input($entryId);

        db_query($sql);
    }

    /**
     * Update entry format in database
     */
    private function updateEntryFormat(object $entry, string $format): void
    {
        if (!defined('THREAD_ENTRY_TABLE') || !function_exists('db_input') || !function_exists('db_query')) {
            return;
        }

        $entryId = $this->getEntryId($entry);
        if ($entryId === null) {
            return;
        }

        // Check current format
        $currentFormat = $this->getEntryFormat($entry);
        if ($currentFormat === $format) {
            return;
        }

        $sql = 'UPDATE ' . THREAD_ENTRY_TABLE
            . ' SET format = ' . db_input($format)
            . ' WHERE id = ' . db_input($entryId);

        if (!db_query($sql)) {
            error_log('[Markdown-Support] Failed to update format: ' . (function_exists('db_error') ? db_error() : 'unknown'));
        }
    }

    /**
     * Get entry ID
     */
    private function getEntryId(object $entry): ?int
    {
        if (method_exists($entry, 'getId')) {
            return (int) $entry->getId();
        }

        return null;
    }

    /**
     * Get entry format
     */
    private function getEntryFormat(object $entry): string
    {
        if (method_exists($entry, 'get')) {
            return (string) $entry->get('format');
        }

        return '';
    }

    /**
     * Validate format value
     */
    private function validateFormat(string $format): string
    {
        $format = strtolower(trim($format));
        $validFormats = ['markdown', 'html', 'text'];

        return in_array($format, $validFormats, true) ? $format : 'html';
    }
}
