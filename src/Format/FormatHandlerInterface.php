<?php

declare(strict_types=1);

namespace MarkdownSupport\Format;

/**
 * Interface for format determination
 *
 * Implementations determine the correct format (markdown/html/text)
 * for ticket creation based on user selection, auto-detection, or config.
 *
 * @package MarkdownSupport
 */
interface FormatHandlerInterface
{
    public const FORMAT_MARKDOWN = 'markdown';
    public const FORMAT_HTML = 'html';
    public const FORMAT_TEXT = 'text';

    /**
     * Determine format based on input data and configuration
     *
     * Priority:
     * 1. Explicit user selection (format field)
     * 2. Auto-detection (if enabled)
     * 3. Default format from config
     *
     * @param array{format?: string, message?: string} $data Input data
     * @return string One of: 'markdown', 'html', 'text'
     */
    public function determineFormat(array $data): string;

    /**
     * Validate and sanitize format value
     *
     * @param string $format Format to validate
     * @return string Valid format (falls back to 'html' if invalid)
     */
    public function validateFormat(string $format): string;
}
