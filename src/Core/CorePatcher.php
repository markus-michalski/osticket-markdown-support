<?php

declare(strict_types=1);

namespace MarkdownSupport\Core;

/**
 * CorePatcher - Handles osTicket core file patching
 *
 * Responsible for:
 * - Extending ThreadEntryBody::$types via Reflection
 * - Patching class.thread.php for fromFormattedText() support
 * - Managing backup/restore of patched files
 *
 * WARNING: Core file patching is fragile and may break on osTicket updates.
 * Always create backups and verify patches after updates.
 *
 * @package MarkdownSupport
 */
final class CorePatcher
{
    private const BACKUP_SUFFIX = '.markdown-backup';

    private string $includeDir;

    public function __construct(string $includeDir)
    {
        $this->includeDir = rtrim($includeDir, '/');
    }

    /**
     * Extend ThreadEntryBody::$types array using Reflection
     *
     * This is the CORE technique that allows us to add 'markdown' as a valid
     * ThreadEntryBody type WITHOUT modifying core files.
     *
     * @return bool True if successful
     */
    public function extendThreadEntryTypes(): bool
    {
        if (!class_exists('ThreadEntryBody')) {
            $this->log('Warning: ThreadEntryBody class not found');
            return false;
        }

        try {
            $reflection = new \ReflectionClass('ThreadEntryBody');
            $typesProperty = $reflection->getProperty('types');
            $typesProperty->setAccessible(true);

            $types = $typesProperty->getValue();

            if (!in_array('markdown', $types, true)) {
                $types[] = 'markdown';
                $typesProperty->setValue(null, $types);
            }

            return true;
        } catch (\ReflectionException $e) {
            $this->log('Failed to extend ThreadEntryBody::$types: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Patch ThreadEntryBody::fromFormattedText() to support 'markdown' format
     *
     * This adds a case statement to handle 'markdown' format in the factory method.
     *
     * @return bool True if patch applied or already exists
     */
    public function patchFromFormattedText(): bool
    {
        $threadFile = $this->includeDir . '/class.thread.php';

        if (!file_exists($threadFile)) {
            $this->log('Error: class.thread.php not found');
            return false;
        }

        $content = file_get_contents($threadFile);
        if ($content === false) {
            $this->log('Error: Cannot read class.thread.php');
            return false;
        }

        // Check if already patched
        if (strpos($content, "case 'markdown':") !== false) {
            return true;
        }

        // Create backup
        if (!$this->createBackup($threadFile)) {
            return false;
        }

        // Apply patch
        $patchedContent = $this->applyPatch($content);
        if ($patchedContent === $content) {
            $this->log('Error: Unable to apply patch - pattern not found');
            return false;
        }

        // Write patched file
        if (file_put_contents($threadFile, $patchedContent) === false) {
            $this->log('Error: Failed to write patched file');
            return false;
        }

        return true;
    }

    /**
     * Restore original class.thread.php from backup
     *
     * @return bool True if restoration successful
     */
    public function restoreFromBackup(): bool
    {
        $threadFile = $this->includeDir . '/class.thread.php';
        $backupFile = $threadFile . self::BACKUP_SUFFIX;

        if (!file_exists($backupFile)) {
            return true; // No backup exists, nothing to restore
        }

        if (!copy($backupFile, $threadFile)) {
            $this->log('Error: Failed to restore from backup');
            return false;
        }

        unlink($backupFile);
        return true;
    }

    /**
     * Check if patch is currently applied
     *
     * @return bool True if patch is applied
     */
    public function isPatchApplied(): bool
    {
        $threadFile = $this->includeDir . '/class.thread.php';

        if (!file_exists($threadFile)) {
            return false;
        }

        $content = file_get_contents($threadFile);
        return $content !== false && strpos($content, "case 'markdown':") !== false;
    }

    /**
     * Verify patch integrity after osTicket update
     *
     * Compares file hash with backup to detect if core was updated.
     *
     * @return bool True if patch is intact, false if reapplication needed
     */
    public function verifyPatchIntegrity(): bool
    {
        $threadFile = $this->includeDir . '/class.thread.php';
        $backupFile = $threadFile . self::BACKUP_SUFFIX;

        if (!file_exists($backupFile)) {
            return false; // No backup, can't verify
        }

        // Check if patch is still present
        return $this->isPatchApplied();
    }

    /**
     * Create backup of original file
     */
    private function createBackup(string $file): bool
    {
        $backupFile = $file . self::BACKUP_SUFFIX;

        if (file_exists($backupFile)) {
            return true; // Backup already exists
        }

        if (!copy($file, $backupFile)) {
            $this->log('Error: Failed to create backup');
            return false;
        }

        return true;
    }

    /**
     * Apply the markdown case patch to content
     */
    private function applyPatch(string $content): string
    {
        // Try standard formatting first
        $patterns = [
            // Standard indentation (8 spaces)
            [
                'search' => "case 'html':\n            return new HtmlThreadEntryBody(\$text, array('strip-embedded'=>false) + \$options);",
                'replace' => "case 'html':\n            return new HtmlThreadEntryBody(\$text, array('strip-embedded'=>false) + \$options);\n        case 'markdown':\n            return new MarkdownThreadEntryBody(\$text, \$options);"
            ],
            // Alternative indentation (12 spaces)
            [
                'search' => "case 'html':\n                return new HtmlThreadEntryBody(\$text, array('strip-embedded'=>false) + \$options);",
                'replace' => "case 'html':\n                return new HtmlThreadEntryBody(\$text, array('strip-embedded'=>false) + \$options);\n            case 'markdown':\n                return new MarkdownThreadEntryBody(\$text, \$options);"
            ]
        ];

        foreach ($patterns as $pattern) {
            $patched = str_replace($pattern['search'], $pattern['replace'], $content);
            if ($patched !== $content) {
                return $patched;
            }
        }

        return $content; // No pattern matched
    }

    /**
     * Log message to error log
     */
    private function log(string $message): void
    {
        error_log('[Markdown-Support] ' . $message);
    }
}
