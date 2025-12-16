<?php

declare(strict_types=1);

namespace MarkdownSupport\Format;

/**
 * MarkdownSanitizer - Unified XSS prevention for Markdown content
 *
 * Provides a single, consistent sanitization layer for all Markdown rendering:
 * - Backend (thread entries)
 * - API (preview endpoint)
 * - Export (email/PDF)
 *
 * Security Architecture:
 * Layer 1: Parsedown SafeMode (escapes inline HTML, blocks <script>)
 * Layer 2: This sanitizer (removes javascript: URLs, on* attributes)
 *
 * @package MarkdownSupport
 */
final class MarkdownSanitizer
{
    /**
     * Sanitize HTML to prevent XSS attacks
     *
     * Should be called AFTER Parsedown rendering but BEFORE output.
     *
     * @param string $html HTML to sanitize
     * @return string Sanitized HTML
     */
    public static function sanitize(string $html): string
    {
        if ($html === '') {
            return '';
        }

        // Remove javascript: URLs (including URL-encoded variants)
        $html = self::removeJavaScriptUrls($html);

        // Remove data: URLs (potential XSS vector)
        $html = self::removeDataUrls($html);

        // Remove on* event handlers (onclick, onload, onerror, etc.)
        $html = self::removeEventHandlers($html);

        // Remove IE-specific expression() CSS (XSS vector)
        $html = self::removeExpressionCss($html);

        // Remove any remaining script tags (defense in depth)
        $html = self::removeScriptTags($html);

        return $html;
    }

    /**
     * Remove javascript: URLs from href/src attributes
     */
    private static function removeJavaScriptUrls(string $html): string
    {
        return preg_replace(
            '/(<[^>]+\s)(href|src)\s*=\s*["\']?\s*javascript:/i',
            '$1data-blocked-$2="',
            $html
        ) ?? $html;
    }

    /**
     * Remove data: URLs (potential XSS via data:text/html)
     */
    private static function removeDataUrls(string $html): string
    {
        return preg_replace(
            '/(<[^>]+\s)(href|src)\s*=\s*["\']?\s*data:/i',
            '$1data-blocked-$2="',
            $html
        ) ?? $html;
    }

    /**
     * Remove on* event handler attributes
     *
     * Runs multiple passes to catch all attributes in same tag.
     */
    private static function removeEventHandlers(string $html): string
    {
        $maxIterations = 10; // Prevent infinite loop
        $iteration = 0;

        do {
            $before = $html;
            // Remove quoted event handlers: onclick="..."
            $html = preg_replace(
                '/(<[^>]+\s)on\w+\s*=\s*["\'][^"\']*["\']/i',
                '$1',
                $html
            ) ?? $html;
            // Remove unquoted event handlers: onclick=alert(1)
            $html = preg_replace(
                '/(<[^>]+\s)on\w+\s*=\s*[^\s>]+/i',
                '$1',
                $html
            ) ?? $html;
            $iteration++;
        } while ($before !== $html && $iteration < $maxIterations);

        return $html;
    }

    /**
     * Remove style attributes containing expression() (IE-specific XSS)
     */
    private static function removeExpressionCss(string $html): string
    {
        return preg_replace(
            '/(<[^>]+\s)style\s*=\s*["\'][^"\']*expression\s*\([^"\']*["\']/i',
            '$1',
            $html
        ) ?? $html;
    }

    /**
     * Remove any remaining <script> tags (defense in depth)
     *
     * Parsedown SafeMode should already handle this, but we double-check.
     */
    private static function removeScriptTags(string $html): string
    {
        return preg_replace(
            '/<script[^>]*>.*?<\/script>/is',
            '',
            $html
        ) ?? $html;
    }

    /**
     * Sanitize using osTicket's Format class if available
     *
     * This delegates to osTicket's htmLawed-based sanitizer for
     * comprehensive sanitization. Use this when running inside osTicket.
     *
     * @param string $html HTML to sanitize
     * @return string Sanitized HTML
     */
    public static function sanitizeWithOsTicket(string $html): string
    {
        // First apply our sanitization
        $html = self::sanitize($html);

        // Then delegate to osTicket's Format::sanitize() if available
        if (class_exists('Format') && method_exists('Format', 'sanitize')) {
            return \Format::sanitize($html);
        }

        return $html;
    }
}
