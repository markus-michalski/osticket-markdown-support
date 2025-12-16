<?php

/**
 * Markdown Support Plugin for osTicket 1.18.x
 *
 * Adds Markdown formatting support for ticket threads using a reflection-based
 * approach that doesn't require core file modifications.
 *
 * Features:
 * - Markdown-to-HTML rendering with Parsedown
 * - 2-layer XSS protection (Parsedown SafeMode + Format::sanitize())
 * - Email/PDF export support
 * - Search indexing support
 * - No core file modifications needed (except one minimal patch)
 *
 * Architecture:
 * - ConfigCache: Singleton for config caching (solves Signal callback issue)
 * - CorePatcher: Handles Reflection and core file patching
 * - AssetInjector: CSS/JS injection into pages
 * - AssetDeployer: API file and .htaccess management
 * - ThreadEntryHandler: Signal handlers for thread entries
 * - MarkdownSanitizer: Unified XSS prevention
 */

// Only include osTicket classes if they exist (not in test environment)
if (defined('INCLUDE_DIR') && file_exists(INCLUDE_DIR . 'class.plugin.php')) {
    require_once INCLUDE_DIR . 'class.plugin.php';
}

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

// Load new service classes
require_once __DIR__ . '/vendor/autoload.php';

use MarkdownSupport\Config\ConfigCache;
use MarkdownSupport\Core\CorePatcher;
use MarkdownSupport\Asset\AssetInjector;
use MarkdownSupport\Asset\AssetDeployer;
use MarkdownSupport\Signal\ThreadEntryHandler;

/**
 * Main plugin class
 *
 * Coordinates all plugin components and handles osTicket lifecycle events.
 * Uses dependency injection pattern for better testability.
 */
class MarkdownPlugin extends Plugin
{
    /** @var string Configuration class name */
    public $config_class = 'MarkdownConfig';

    /** @var CorePatcher|null Core patcher instance */
    private ?CorePatcher $corePatcher = null;

    /** @var AssetInjector|null Asset injector instance */
    private ?AssetInjector $assetInjector = null;

    /** @var AssetDeployer|null Asset deployer instance */
    private ?AssetDeployer $assetDeployer = null;

    /** @var ThreadEntryHandler|null Thread entry handler instance */
    private ?ThreadEntryHandler $threadEntryHandler = null;

    /**
     * Only one instance of this plugin makes sense
     */
    public function isSingleton(): bool
    {
        return true;
    }

    /**
     * Bootstrap plugin - called when osTicket initializes
     */
    public function bootstrap(): void
    {
        $this->initializeServices();
        $this->populateConfigCache();
        $this->checkVersion();
        $this->deployAssets();

        // Only proceed if plugin is enabled
        if (!$this->isEnabled()) {
            return;
        }

        $this->extendCoreClasses();
        $this->registerSignalHandlers();
        $this->setupAssetInjection();
    }

    /**
     * Initialize service instances
     */
    private function initializeServices(): void
    {
        $includeDir = defined('INCLUDE_DIR') ? INCLUDE_DIR : __DIR__ . '/mocks/';
        $osticketRoot = dirname($includeDir);
        $pluginUrl = $this->getPluginUrl();

        $this->corePatcher = new CorePatcher($includeDir);
        $this->assetDeployer = new AssetDeployer(__DIR__, $osticketRoot);
        $this->assetInjector = new AssetInjector($pluginUrl, ConfigCache::getInstance());
        $this->threadEntryHandler = new ThreadEntryHandler(
            ConfigCache::getInstance(),
            $this->createMarkdownDetector()
        );
    }

    /**
     * Populate config cache for Signal callbacks
     *
     * Signal callbacks receive new plugin instances without proper config.
     * We cache config values statically to work around this osTicket limitation.
     */
    private function populateConfigCache(): void
    {
        $config = $this->getConfig();

        ConfigCache::getInstance()->populate([
            'default_format' => $config->get('default_format') ?? 'markdown',
            'allow_format_switch' => $config->get('allow_format_switch') ?? true,
            'show_toolbar' => $config->get('show_toolbar') ?? true,
            'installed_version' => $config->get('installed_version') ?? '',
            'auto_convert_to_markdown' => $config->get('auto_convert_to_markdown') ?? false,
            'auto_detect_threshold' => 5,
        ]);
    }

    /**
     * Check if plugin is enabled
     */
    private function isEnabled(): bool
    {
        return (bool) $this->getConfig()->get('enabled');
    }

    /**
     * Extend core osTicket classes
     */
    private function extendCoreClasses(): void
    {
        // Add 'markdown' to ThreadEntryBody::$types via Reflection
        $this->corePatcher->extendThreadEntryTypes();

        // Load MarkdownThreadEntryBody class
        $this->registerMarkdownBodyClass();

        // Patch class.thread.php for fromFormattedText() support
        $this->corePatcher->patchFromFormattedText();
    }

    /**
     * Register Signal handlers
     */
    private function registerSignalHandlers(): void
    {
        // Asset injection when viewing tickets
        Signal::connect('object.view', [$this, 'onObjectView']);

        // Format correction after thread entry creation
        Signal::connect('threadentry.created', [$this, 'onThreadEntryCreated']);
    }

    /**
     * Setup asset injection via output buffering
     */
    private function setupAssetInjection(): void
    {
        // Skip AJAX requests
        if ($this->assetInjector->isAjaxRequest()) {
            return;
        }

        // Only inject on editor pages
        if ($this->assetInjector->isEditorPage()) {
            ob_start([$this->assetInjector, 'injectAssetsIntoOutput']);
        }
    }

    /**
     * Deploy plugin assets
     */
    private function deployAssets(): void
    {
        $this->assetDeployer->deployApiFile();
    }

    /**
     * Check plugin version and perform updates if needed
     */
    private function checkVersion(): void
    {
        $pluginFile = $this->getPluginPhpPath();

        if (!file_exists($pluginFile)) {
            return;
        }

        $pluginInfo = include($pluginFile);
        $currentVersion = $pluginInfo['version'] ?? '0.0.0';
        $installedVersion = $this->getConfig()->get('installed_version') ?? '';

        if (!$installedVersion || version_compare($installedVersion, $currentVersion, '<')) {
            $this->performUpdate($installedVersion, $currentVersion);
        }
    }

    /**
     * Perform plugin update
     */
    private function performUpdate(string $fromVersion, string $toVersion): void
    {
        $this->assetDeployer->updateIncludeHtaccess();
        $this->assetDeployer->deployApiFile();
        $this->getConfig()->set('installed_version', $toVersion);
    }

    /**
     * Register MarkdownThreadEntryBody class
     */
    private function registerMarkdownBodyClass(): void
    {
        $bodyFile = __DIR__ . '/markdown-body.php';

        if (!file_exists($bodyFile)) {
            error_log('[Markdown-Support] Warning: markdown-body.php not found');
            return;
        }

        require_once $bodyFile;
    }

    /**
     * Create MarkdownDetector instance for auto-detection
     */
    private function createMarkdownDetector(): ?object
    {
        $detectorFile = __DIR__ . '/MarkdownDetector.php';

        if (!file_exists($detectorFile)) {
            return null;
        }

        require_once $detectorFile;

        if (!class_exists('MarkdownDetector')) {
            return null;
        }

        return new \MarkdownDetector();
    }

    /**
     * Get path to plugin.php
     */
    private function getPluginPhpPath(): string
    {
        if (defined('INCLUDE_DIR')) {
            return INCLUDE_DIR . 'plugins/' . basename(__DIR__) . '/plugin.php';
        }

        return __DIR__ . '/plugin.php';
    }

    /**
     * Get plugin base URL
     */
    public function getPluginUrl(): string
    {
        $pluginDir = basename(__DIR__);
        $rootPath = defined('ROOT_PATH') ? ROOT_PATH : '/';

        return $rootPath . 'include/plugins/' . $pluginDir;
    }

    // =========================================================================
    // Plugin Lifecycle Methods (called by osTicket)
    // =========================================================================

    /**
     * Called when plugin is enabled in admin panel
     */
    public function enable()
    {
        $errors = [];

        // Auto-create instance for singleton plugin
        if ($this->isSingleton() && $this->getNumInstances() === 0) {
            $vars = [
                'name' => $this->getName(),
                'isactive' => 1,
                'notes' => 'Auto-created singleton instance',
            ];

            if (!$this->addInstance($vars, $errors)) {
                error_log(sprintf(
                    '[Markdown-Support] Failed to auto-create instance: %s',
                    json_encode($errors)
                ));
                return $errors;
            }
        }

        // Initialize services for enable operations
        $this->initializeServices();

        // Deploy assets
        $this->assetDeployer->updateIncludeHtaccess();
        $this->assetDeployer->deployApiFile();

        // Save current version
        $pluginFile = $this->getPluginPhpPath();
        if (file_exists($pluginFile)) {
            $pluginInfo = include($pluginFile);
            $this->getConfig()->set('installed_version', $pluginInfo['version'] ?? '1.0.0');
        }

        return empty($errors) ? true : $errors;
    }

    /**
     * Called when plugin is disabled in admin panel
     */
    public function disable(): bool
    {
        // Initialize services for disable operations
        $this->initializeServices();

        // Restore original core files
        $this->corePatcher->restoreFromBackup();

        // Remove deployed assets
        $this->assetDeployer->removeApiFile();
        $this->assetDeployer->removeHtaccessRules();

        return true;
    }

    // =========================================================================
    // Signal Handlers
    // =========================================================================

    /**
     * Signal handler for object.view
     *
     * Injects Markdown editor assets when viewing tickets.
     *
     * @param object $object The object being viewed (Ticket, Task, etc.)
     */
    public function onObjectView($object): void
    {
        if (!($object instanceof Ticket)) {
            return;
        }

        $this->assetInjector->injectAssets();
    }

    /**
     * Signal handler for threadentry.created
     *
     * Delegates to ThreadEntryHandler for format detection and correction.
     *
     * @param object $entry The created thread entry
     */
    public function onThreadEntryCreated($entry): void
    {
        $this->threadEntryHandler->onThreadEntryCreated($entry);
    }

    // =========================================================================
    // Backward Compatibility
    // =========================================================================

    /**
     * Debug logging function (deprecated)
     *
     * @deprecated Debug logging has been removed from production code
     */
    public static function debugLog(string $message, string $level = 'DEBUG', array $context = []): void
    {
        // No-op: Kept for backward compatibility
    }

    /**
     * Legacy static config cache access
     *
     * @deprecated Use ConfigCache::getInstance() instead
     */
    public static function getCachedConfig(): array
    {
        return ConfigCache::getInstance()->all();
    }
}
