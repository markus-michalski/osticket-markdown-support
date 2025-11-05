<?php

/**
 * MarkdownDetector - Detects Markdown syntax in plain text
 *
 * Used for auto-detection of Markdown formatting during ticket creation.
 * Provides confidence scoring for intelligent format selection.
 *
 * @package MarkdownSupport
 * @version 1.0.0
 */
class MarkdownDetector
{
    /**
     * Markdown syntax patterns for detection
     * Each pattern has a weight for confidence scoring
     */
    private $patterns = [
        // Headers (# Heading)
        'headers' => [
            'pattern' => '/^#{1,6}\s+.+$/m',
            'weight' => 15
        ],
        // Bold (**text**)
        'bold' => [
            'pattern' => '/\*\*[^*]+\*\*/',
            'weight' => 10
        ],
        // Italic (*text* or _text_)
        'italic' => [
            'pattern' => '/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/',
            'weight' => 8
        ],
        // Code blocks (```code```)
        'code_blocks' => [
            'pattern' => '/```[\s\S]*?```/',
            'weight' => 20
        ],
        // Inline code (`code`)
        'inline_code' => [
            'pattern' => '/`[^`]+`/',
            'weight' => 5
        ],
        // Unordered lists (- item or * item)
        'unordered_lists' => [
            'pattern' => '/^[\*\-]\s+.+$/m',
            'weight' => 12
        ],
        // Ordered lists (1. item)
        'ordered_lists' => [
            'pattern' => '/^\d+\.\s+.+$/m',
            'weight' => 12
        ],
        // Links ([text](url))
        'links' => [
            'pattern' => '/\[([^\]]+)\]\(([^\)]+)\)/',
            'weight' => 15
        ],
        // Blockquotes (> text)
        'blockquotes' => [
            'pattern' => '/^>\s+.+$/m',
            'weight' => 10
        ],
        // Horizontal rules (---)
        'horizontal_rules' => [
            'pattern' => '/^---+$/m',
            'weight' => 5
        ]
    ];

    /**
     * False positive patterns to exclude
     * These are patterns that LOOK like Markdown but aren't
     */
    private $falsePositivePatterns = [
        // Email addresses (contain @ which can be confused with lists)
        '/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/',
        // Math expressions (5*3 should not trigger italic detection)
        // Handled by pattern design instead
    ];

    /**
     * Check if text contains Markdown syntax
     *
     * @param string $text Text to analyze
     * @param int $threshold Minimum confidence score (0-100) to return true
     * @return bool True if Markdown syntax detected with confidence >= threshold
     */
    public function hasMarkdownSyntax($text, $threshold = 5)
    {
        if (empty(trim($text))) {
            return false;
        }

        $confidence = $this->getConfidenceScore($text);
        return $confidence >= $threshold;
    }

    /**
     * Calculate confidence score (0-100) that text is Markdown
     *
     * Higher score = more confident that text contains Markdown syntax
     *
     * @param string $text Text to analyze
     * @return int Confidence score (0-100)
     */
    public function getConfidenceScore($text)
    {
        if (empty(trim($text))) {
            return 0;
        }

        // Check for false positives first
        if ($this->hasFalsePositives($text)) {
            // Don't return 0 immediately, but reduce confidence later
        }

        $totalWeight = 0;
        $maxPossibleWeight = 100;

        foreach ($this->patterns as $name => $config) {
            $pattern = $config['pattern'];
            $weight = $config['weight'];

            // Count matches
            $matchCount = preg_match_all($pattern, $text, $matches);

            if ($matchCount > 0) {
                // Add weight (cap at pattern's max weight even for multiple matches)
                $totalWeight += $weight;
            }
        }

        // Calculate percentage (0-100)
        $confidence = min(100, ($totalWeight / $maxPossibleWeight) * 100);

        return (int) $confidence;
    }

    /**
     * Get detailed analysis of Markdown features found
     *
     * @param string $text Text to analyze
     * @return array Array of features found with counts
     */
    public function analyzeFeatures($text)
    {
        $features = [];

        foreach ($this->patterns as $name => $config) {
            $pattern = $config['pattern'];
            $matchCount = preg_match_all($pattern, $text, $matches);

            if ($matchCount > 0) {
                $features[$name] = [
                    'count' => $matchCount,
                    'weight' => $config['weight'],
                    'matches' => $matches[0] ?? []
                ];
            }
        }

        return $features;
    }

    /**
     * Check if text contains false positive patterns
     *
     * @param string $text Text to check
     * @return bool True if false positives detected
     */
    private function hasFalsePositives($text)
    {
        foreach ($this->falsePositivePatterns as $pattern) {
            if (preg_match($pattern, $text)) {
                return true;
            }
        }

        return false;
    }
}
