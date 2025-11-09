<?php

// Only load if ThreadEntryBody exists (production environment)
if (!class_exists('ThreadEntryBody')) {
    return;
}

// Load Parsedown library via Composer autoload
$autoload_file = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload_file)) {
    error_log('[Markdown-Support] Warning: Composer autoload not found');
    return;
}
require_once $autoload_file;

/**
 * MarkdownThreadEntryBody - Markdown formatter for osTicket thread entries
 *
 * Extends ThreadEntryBody to provide Markdown-to-HTML rendering with:
 * - 2-layer XSS protection (Parsedown SafeMode + Format::sanitize())
 * - Email/PDF export support
 * - Search indexing support
 * - Backward compatibility with text/html formats
 *
 * Security Architecture:
 * Layer 1: Parsedown SafeMode - Escapes inline HTML, blocks <script> tags
 * Layer 2: Format::sanitize() - Removes javascript: URLs and dangerous attributes
 */
class MarkdownThreadEntryBody extends ThreadEntryBody {

    /**
     * Constructor
     *
     * @param string $body Markdown content
     * @param array $options Options (unused currently)
     */
    function __construct($body, $options=array()) {
        parent::__construct($body, 'markdown', $options);
    }

    /**
     * Display rendered Markdown as HTML
     *
     * This is the main rendering method called by osTicket when displaying
     * thread entries in UI, emails, and PDFs.
     *
     * @param string|bool $output Output mode: 'email', 'pdf', or false for HTML
     * @return string Rendered HTML
     */
    function display($output=false) {
        // Handle empty body
        if (empty($this->body)) {
            return '';
        }

        // Initialize Parsedown with SafeMode
        $parsedown = new Parsedown();
        $parsedown->setSafeMode(true); // CRITICAL: XSS Prevention Layer 1

        // Convert Markdown to HTML
        $html = $parsedown->text($this->body);

        // CRITICAL: Layer 2 - Additional XSS prevention via Format::sanitize()
        // This removes javascript: URLs (including URL-encoded variants) and
        // strips dangerous HTML attributes
        $html = Format::sanitize($html);

        // Handle different output modes
        switch ($output) {
        case 'email':
            // Email clients need inline styles and safe HTML
            return $this->prepareForEmail($html);

        case 'pdf':
            // PDF export needs clean HTML without styles
            return $this->prepareForPdf($html);

        default:
            // Default: Return sanitized HTML for web display
            return $html;
        }
    }

    /**
     * Prepare HTML for email export
     *
     * @param string $html Sanitized HTML
     * @return string Email-ready HTML
     */
    function prepareForEmail($html) {
        // Future: Add inline CSS styles for better email rendering
        // For now, return sanitized HTML as-is
        return $html;
    }

    /**
     * Prepare HTML for PDF export
     *
     * @param string $html Sanitized HTML
     * @return string PDF-ready HTML
     */
    function prepareForPdf($html) {
        // PDF export needs clean HTML without external resources
        // Remove any remaining external links to images/scripts
        $html = preg_replace('/<img[^>]+src="https?:\/\/[^"]+"[^>]*>/i', '[Image]', $html);

        return $html;
    }

    /**
     * Convert to HTML (alias for display())
     *
     * Used by various osTicket components that expect toHtml() method
     *
     * @return string Rendered HTML
     */
    function toHtml() {
        return $this->display('html');
    }

    /**
     * Get searchable text for search indexing
     *
     * Converts Markdown → HTML → Plain Text for search indexing
     *
     * @return string Plain text without HTML tags
     */
    function getSearchable() {
        // Convert to HTML first
        $html = $this->toHtml();

        // Strip HTML tags to get plain text
        return Format::html2text($html);
    }

    /**
     * Get clean HTML for display (backward compatibility)
     *
     * @return string Rendered HTML
     */
    function getClean() {
        return $this->display();
    }

    /**
     * Get body as plain text (for editing)
     *
     * Returns raw Markdown source, not rendered HTML
     *
     * @return string Raw Markdown content
     */
    function getOriginal() {
        return $this->body;
    }

    /**
     * Get type identifier
     *
     * @return string 'markdown'
     */
    function getType() {
        return 'markdown';
    }

    /**
     * Check if body is empty
     *
     * @return bool True if body is empty
     */
    function isEmpty() {
        return empty(trim($this->body));
    }
}

/**
 * Factory method extension for ThreadEntryBody::fromFormattedText()
 *
 * This would be registered via a hook/filter if osTicket supported it.
 * For now, we rely on direct instantiation via 'new MarkdownThreadEntryBody()'
 */
if (!function_exists('markdown_thread_entry_factory')) {
    function markdown_thread_entry_factory($text, $format, $options) {
        if ($format === 'markdown') {
            return new MarkdownThreadEntryBody($text, $options);
        }
        return null; // Let osTicket handle other formats
    }
}
