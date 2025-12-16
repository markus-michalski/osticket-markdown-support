<?php

declare(strict_types=1);

namespace MarkdownSupport\Asset;

/**
 * AssetDeployer - Deploys plugin assets to accessible locations
 *
 * Handles:
 * - API file deployment to /api/ directory
 * - .htaccess updates for static asset access
 * - File permission management
 *
 * @package MarkdownSupport
 */
final class AssetDeployer
{
    private string $pluginDir;
    private string $osticketRoot;

    public function __construct(string $pluginDir, string $osticketRoot)
    {
        $this->pluginDir = rtrim($pluginDir, '/');
        $this->osticketRoot = rtrim($osticketRoot, '/');
    }

    /**
     * Deploy API endpoint file to /api/ directory
     *
     * Copies markdown-preview.php from plugin to /api/ to avoid
     * Apache "Deny from all" restrictions in /include/.htaccess
     *
     * @return bool True if deployment successful
     */
    public function deployApiFile(): bool
    {
        $sourceFile = $this->pluginDir . '/markdown-preview.php';
        $apiDir = $this->osticketRoot . '/api';
        $targetFile = $apiDir . '/markdown-preview.php';

        if (!file_exists($sourceFile)) {
            $this->log('Warning: markdown-preview.php not found in plugin directory');
            return false;
        }

        if (!is_dir($apiDir)) {
            $this->log('Error: /api directory not found');
            return false;
        }

        // Check if target is up-to-date
        if (file_exists($targetFile)) {
            $sourceHash = md5_file($sourceFile);
            $targetHash = md5_file($targetFile);

            if ($sourceHash === $targetHash) {
                return true; // Already up-to-date
            }
        }

        // Copy file
        if (!@copy($sourceFile, $targetFile)) {
            $this->log('Error: Cannot copy API file to ' . $targetFile);
            return false;
        }

        // Set permissions
        if (!@chmod($targetFile, 0644)) {
            $this->log('Warning: Failed to set permissions on API file');
        }

        return true;
    }

    /**
     * Remove deployed API file
     *
     * @return bool True if removal successful
     */
    public function removeApiFile(): bool
    {
        $apiFile = $this->osticketRoot . '/api/markdown-preview.php';

        if (!file_exists($apiFile)) {
            return true; // Already removed
        }

        if (!@unlink($apiFile)) {
            $this->log('Warning: Could not remove API file: ' . $apiFile);
            return false;
        }

        return true;
    }

    /**
     * Update /include/.htaccess to allow static assets for plugins
     *
     * Adds FilesMatch rules for CSS, JS, images, and fonts.
     *
     * @return bool True if update successful
     */
    public function updateIncludeHtaccess(): bool
    {
        $htaccessFile = $this->osticketRoot . '/include/.htaccess';

        if (!file_exists($htaccessFile)) {
            $this->log('Warning: /include/.htaccess not found');
            return false;
        }

        $content = file_get_contents($htaccessFile);
        if ($content === false) {
            $this->log('Error: Cannot read /include/.htaccess');
            return false;
        }

        // Check if already updated
        if (strpos($content, 'Allow PHP API endpoints in plugin directories') !== false) {
            return true;
        }

        // Find insertion point
        $insertionPoint = $this->findInsertionPoint($content);
        if ($insertionPoint === null) {
            $this->log('Could not find insertion point in /include/.htaccess');
            return false;
        }

        // Generate new rules
        $newRules = $this->generateHtaccessRules();

        // Insert rules
        $newContent = preg_replace(
            $insertionPoint['pattern'],
            $insertionPoint['match'] . $newRules,
            $content,
            1
        );

        if ($newContent === null || $newContent === $content) {
            $this->log('Error: Failed to insert .htaccess rules');
            return false;
        }

        if (file_put_contents($htaccessFile, $newContent) === false) {
            $this->log('Error: Failed to write .htaccess');
            return false;
        }

        return true;
    }

    /**
     * Remove plugin rules from /include/.htaccess
     *
     * @return bool True if removal successful
     */
    public function removeHtaccessRules(): bool
    {
        $htaccessFile = $this->osticketRoot . '/include/.htaccess';

        if (!file_exists($htaccessFile)) {
            return true;
        }

        $content = file_get_contents($htaccessFile);
        if ($content === false) {
            return false;
        }

        // Remove all our FilesMatch blocks
        $pattern = '/\n\n# Allow static assets (and API endpoints )?for plugins.*?<\/FilesMatch>(\n\n# Allow PHP API endpoints.*?<\/FilesMatch>)?/s';
        $newContent = preg_replace($pattern, '', $content);

        if ($newContent === $content) {
            return true; // Nothing to remove
        }

        return file_put_contents($htaccessFile, $newContent) !== false;
    }

    /**
     * Find insertion point in .htaccess content
     *
     * @return array{pattern: string, match: string}|null
     */
    private function findInsertionPoint(string $content): ?array
    {
        // Try Apache 2.4 style first
        if (preg_match('/(# Apache 2\.2\s+<IfModule !mod_authz_core\.c>.*?<\/IfModule>)/s', $content, $matches)) {
            return [
                'pattern' => '/(# Apache 2\.2\s+<IfModule !mod_authz_core\.c>.*?<\/IfModule>)/s',
                'match' => $matches[1]
            ];
        }

        // Try Apache 2.2 style
        if (preg_match('/(Deny from all)/', $content, $matches)) {
            return [
                'pattern' => '/(Deny from all)/',
                'match' => $matches[1]
            ];
        }

        return null;
    }

    /**
     * Generate Apache .htaccess rules for both 2.2 and 2.4
     */
    private function generateHtaccessRules(): string
    {
        return <<<'HTACCESS'


# Allow static assets and API endpoints for plugins
<FilesMatch "\.(js|css|map|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|otf)$">
    # Apache 2.4
    <IfModule mod_authz_core.c>
        Require all granted
    </IfModule>

    # Apache 2.2
    <IfModule !mod_authz_core.c>
        Order allow,deny
        Allow from all
    </IfModule>
</FilesMatch>

# Allow PHP API endpoints in plugin directories
<FilesMatch "^plugins/.+\.php$">
    # Apache 2.4
    <IfModule mod_authz_core.c>
        Require all granted
    </IfModule>

    # Apache 2.2
    <IfModule !mod_authz_core.c>
        Order allow,deny
        Allow from all
    </IfModule>
</FilesMatch>
HTACCESS;
    }

    /**
     * Log message to error log
     */
    private function log(string $message): void
    {
        error_log('[Markdown-Support] ' . $message);
    }
}
