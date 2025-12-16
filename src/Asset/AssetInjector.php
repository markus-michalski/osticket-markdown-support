<?php

declare(strict_types=1);

namespace MarkdownSupport\Asset;

use MarkdownSupport\Config\ConfigCache;

/**
 * AssetInjector - Injects CSS/JS assets into osTicket pages
 *
 * Handles:
 * - CSS injection (in <head> for FOUC prevention)
 * - JavaScript injection (deferred for performance)
 * - Configuration injection (window.osTicketMarkdownConfig)
 * - Output buffer-based injection for pages without proper hooks
 *
 * @package MarkdownSupport
 */
final class AssetInjector
{
    private string $pluginUrl;
    private ConfigCache $configCache;

    public function __construct(string $pluginUrl, ConfigCache $configCache)
    {
        $this->pluginUrl = rtrim($pluginUrl, '/');
        $this->configCache = $configCache;
    }

    /**
     * Check if current page needs Markdown editor assets
     *
     * @return bool True if page is ticket-related
     */
    public function isEditorPage(): bool
    {
        $script = basename($_SERVER['SCRIPT_NAME'] ?? '');
        $requestUri = $_SERVER['REQUEST_URI'] ?? '';

        // Pages that need the editor
        return in_array($script, ['tickets.php', 'ticket.php'], true)
            || ($script === 'ajax.php' && strpos($requestUri, 'ticket') !== false);
    }

    /**
     * Check if current request is AJAX
     *
     * @return bool True if AJAX request
     */
    public function isAjaxRequest(): bool
    {
        $xRequestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
        return strtolower($xRequestedWith) === 'xmlhttprequest';
    }

    /**
     * Get editor assets as HTML string
     *
     * @return string HTML with config, CSS, and JS tags
     */
    public function getAssetsHtml(): string
    {
        $config = $this->configCache;

        $defaultFormat = $config->get('default_format', 'markdown');
        $allowFormatSwitch = (bool) $config->get('allow_format_switch', true);
        $showToolbar = (bool) $config->get('show_toolbar', true);
        $version = $config->get('installed_version', '');

        // Build URLs with cache-busting
        $cacheParam = $version ? '?v=' . urlencode($version) : '';
        $cssUrl = $this->pluginUrl . '/css/markdown-editor.css' . $cacheParam;
        $jsUrl = $this->pluginUrl . '/js/markdown-editor.js' . $cacheParam;

        // Determine preview API URL
        $previewApiUrl = $this->getPreviewApiUrl();

        // Build HTML
        $html = $this->buildConfigScript($defaultFormat, $allowFormatSwitch, $showToolbar, $previewApiUrl);
        $html .= $this->buildCssTag($cssUrl);
        $html .= $this->buildJsTag($jsUrl);

        return $html;
    }

    /**
     * Inject assets directly (for use in Signal handlers)
     */
    public function injectAssets(): void
    {
        echo $this->getAssetsHtml();
    }

    /**
     * Output buffer callback to inject assets into HTML output
     *
     * @param string $buffer HTML output buffer
     * @return string Modified HTML with injected assets
     */
    public function injectAssetsIntoOutput(string $buffer): string
    {
        // Prevent double injection
        if (strpos($buffer, 'window.osTicketMarkdownConfig') !== false) {
            return $buffer;
        }

        $assets = $this->getAssetsHtml();

        // Inject before </head> if possible
        if (stripos($buffer, '</head>') !== false) {
            return str_ireplace('</head>', $assets . '</head>', $buffer);
        }

        // Fallback: inject before </body>
        if (stripos($buffer, '</body>') !== false) {
            return str_ireplace('</body>', $assets . '</body>', $buffer);
        }

        // Last resort: append to end
        return $buffer . $assets;
    }

    /**
     * Build JavaScript config object
     */
    private function buildConfigScript(
        string $defaultFormat,
        bool $allowFormatSwitch,
        bool $showToolbar,
        string $previewApiUrl
    ): string {
        $config = [
            'defaultFormat' => $defaultFormat,
            'allowFormatSwitch' => $allowFormatSwitch,
            'showToolbar' => $showToolbar,
            'previewApiUrl' => $previewApiUrl,
        ];

        return '<script>' . "\n"
            . 'window.osTicketMarkdownConfig = ' . json_encode($config, JSON_UNESCAPED_SLASHES) . ';' . "\n"
            . '</script>' . "\n";
    }

    /**
     * Build CSS link tag
     */
    private function buildCssTag(string $url): string
    {
        return '<link rel="stylesheet" href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '">' . "\n";
    }

    /**
     * Build deferred JavaScript tag
     */
    private function buildJsTag(string $url): string
    {
        return '<script defer src="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '"></script>' . "\n";
    }

    /**
     * Get preview API URL
     *
     * Returns path relative to osTicket root.
     */
    private function getPreviewApiUrl(): string
    {
        // ROOT_PATH is osTicket's web root path
        if (defined('ROOT_PATH')) {
            return ROOT_PATH . 'api/markdown-preview.php';
        }

        // Fallback for testing
        return '/api/markdown-preview.php';
    }
}
