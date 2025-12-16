<?php

declare(strict_types=1);

namespace MarkdownSupport\Format;

/**
 * Interface for Markdown syntax detection
 *
 * Implementations analyze text to determine if it contains Markdown syntax.
 * Used for auto-detection feature when creating tickets via API.
 *
 * @package MarkdownSupport
 */
interface MarkdownDetectorInterface
{
    /**
     * Check if text contains Markdown syntax
     *
     * @param string $text Text to analyze
     * @param int $threshold Minimum confidence score (0-100) to return true
     * @return bool True if Markdown syntax detected with confidence >= threshold
     */
    public function hasMarkdownSyntax(string $text, int $threshold = 5): bool;

    /**
     * Calculate confidence score (0-100) that text is Markdown
     *
     * Higher score = more confident that text contains Markdown syntax.
     *
     * @param string $text Text to analyze
     * @return int Confidence score (0-100)
     */
    public function getConfidenceScore(string $text): int;

    /**
     * Get detailed analysis of Markdown features found
     *
     * @param string $text Text to analyze
     * @return array<string, array{count: int, weight: int, matches: string[]}> Features found
     */
    public function analyzeFeatures(string $text): array;
}
