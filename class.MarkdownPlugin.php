<?php

// Only include osTicket classes if they exist (not in test environment)
if (defined('INCLUDE_DIR') && file_exists(INCLUDE_DIR . 'class.plugin.php')) {
    require_once INCLUDE_DIR . 'class.plugin.php';
}

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

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
 * - No core file modifications needed
 */
class MarkdownPlugin extends Plugin {
    var $config_class = 'MarkdownConfig';

    // CRITICAL FIX: Static config cache for Signal callbacks
    // Signal callbacks get a new instance without proper config
    // So we cache config values statically during bootstrap
    static $cached_config = null;

    /**
     * Only one instance of this plugin makes sense
     */
    function isSingleton() {
        return true;
    }

    /**
     * Bootstrap plugin - called when osTicket initializes
     */
    function bootstrap() {
        // Get config from the REAL instance (has proper ID)
        $config = $this->getConfig();

        // CRITICAL FIX: Cache config values statically for Signal callbacks
        // Signal callbacks get a new instance without config, so they read from cache
        self::$cached_config = [
            'default_format' => $config->get('default_format'),
            'allow_format_switch' => $config->get('allow_format_switch'),
            'show_toolbar' => $config->get('show_toolbar'),
            'installed_version' => $config->get('installed_version'),
            // Deprecated: Kept for backward compatibility with old DB entries
            'enable_debug_logging' => false
        ];

        // Version tracking and auto-update
        $this->checkVersion();

        // Deploy API file to /api/markdown/ (avoids /include/.htaccess issues)
        $this->ensureApiFileDeployed();

        // Only proceed if plugin is enabled
        $enabled = $config->get('enabled');

        if (!$enabled) {
            return;
        }

        // CRITICAL: Extend ThreadEntryBody::$types with 'markdown' using Reflection
        $this->extendThreadEntryTypes();

        // Register custom MarkdownThreadEntryBody class
        $this->registerMarkdownBodyClass();

        // CRITICAL: Patch ThreadEntryBody::fromFormattedText() to support 'markdown'
        $this->patchFromFormattedTextIfNeeded();

        // Connect signals for UI integration
        Signal::connect('object.view', array($this, 'onObjectView'));

        // Hook into thread entry creation for format correction
        Signal::connect('threadentry.created', array($this, 'onThreadEntryCreated'));

        // CRITICAL: Hook before thread entry is saved to fix format field
        Signal::connect('model.created', array($this, 'onModelCreated'));

        // CRITICAL: Inject assets on ALL ticket-related pages
        // object.view only fires when viewing existing objects, not on "New Ticket" form
        // So we inject assets directly here if we're on a relevant page
        // IMPORTANT: Skip AJAX requests to avoid interfering with ticket locking
        $isAjax = !empty($_SERVER['HTTP_X_REQUESTED_WITH']) &&
                  strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';

        if ($this->isEditorPage() && !$isAjax) {
            // Use output buffering to inject assets at the right time
            ob_start(array($this, 'injectAssetsIntoOutput'));
        }
    }

    /**
     * Extend ThreadEntryBody::$types array using Reflection
     *
     * This is the CORE technique that allows us to add 'markdown' as a valid
     * ThreadEntryBody type WITHOUT modifying core files.
     */
    function extendThreadEntryTypes() {
        // Check if ThreadEntryBody class exists
        if (!class_exists('ThreadEntryBody')) {
            error_log('[Markdown-Support] Warning: ThreadEntryBody class not found');
            return;
        }

        try {
            $reflection = new ReflectionClass('ThreadEntryBody');
            $types_prop = $reflection->getProperty('types');
            $types_prop->setAccessible(true);

            $types = $types_prop->getValue();

            // Add 'markdown' if not already present
            if (!in_array('markdown', $types)) {
                $types[] = 'markdown';
                $types_prop->setValue(null, $types);
            }
        } catch (ReflectionException $e) {
            error_log('[Markdown-Support] Failed to extend ThreadEntryBody::$types: ' . $e->getMessage());
        }
    }

    /**
     * Register MarkdownThreadEntryBody class
     */
    function registerMarkdownBodyClass() {
        // Load MarkdownThreadEntryBody class
        $body_file = __DIR__ . '/markdown-body.php';

        if (!file_exists($body_file)) {
            error_log('[Markdown-Support] Warning: markdown-body.php not found');
            return;
        }

        require_once $body_file;

        // Verify class was loaded
        if (!class_exists('MarkdownThreadEntryBody')) {
            error_log('[Markdown-Support] Warning: MarkdownThreadEntryBody class not found');
            return;
        }
    }

    /**
     * Patches ThreadEntryBody::fromFormattedText() to support 'markdown' format
     *
     * This is a minimal, safe patch that adds one case statement to class.thread.php
     */
    function patchFromFormattedTextIfNeeded() {
        $thread_file = INCLUDE_DIR . 'class.thread.php';

        if (!file_exists($thread_file)) {
            error_log('[Markdown-Support] Error: class.thread.php not found');
            return false;
        }

        $content = file_get_contents($thread_file);

        // Check if already patched
        if (strpos($content, "case 'markdown':") !== false) {
            return true;
        }

        // Create backup
        $backup_file = $thread_file . '.markdown-backup';
        if (!file_exists($backup_file)) {
            if (!copy($thread_file, $backup_file)) {
                error_log('[Markdown-Support] Error: Failed to create backup');
                return false;
            }
        }

        // Patch: Add 'markdown' case to fromFormattedText()
        $search = "case 'html':\n            return new HtmlThreadEntryBody(\$text, array('strip-embedded'=>false) + \$options);";
        $replace = "case 'html':\n            return new HtmlThreadEntryBody(\$text, array('strip-embedded'=>false) + \$options);\n        case 'markdown':\n            return new MarkdownThreadEntryBody(\$text, \$options);";

        $patched_content = str_replace($search, $replace, $content);

        if ($patched_content === $content) {
            error_log('[Markdown-Support] Warning: Patch pattern not found, trying alternative...');

            // Alternative pattern (different whitespace)
            $search = "case 'html':\n                return new HtmlThreadEntryBody(\$text, array('strip-embedded'=>false) + \$options);";
            $replace = "case 'html':\n                return new HtmlThreadEntryBody(\$text, array('strip-embedded'=>false) + \$options);\n            case 'markdown':\n                return new MarkdownThreadEntryBody(\$text, \$options);";

            $patched_content = str_replace($search, $replace, $content);
        }

        if ($patched_content === $content) {
            error_log('[Markdown-Support] Error: Unable to apply patch');
            return false;
        }

        // Write patched file
        if (file_put_contents($thread_file, $patched_content) === false) {
            error_log('[Markdown-Support] Error: Failed to write patched file');
            return false;
        }

        return true;
    }

    /**
     * Check plugin version and perform updates if needed
     */
    function checkVersion() {
        $plugin_file = INCLUDE_DIR . 'plugins/' . basename(dirname(__FILE__)) . '/plugin.php';

        if (!file_exists($plugin_file)) {
            error_log('[Markdown-Support] plugin.php not found');
            return;
        }

        $plugin_info = include($plugin_file);
        $current_version = $plugin_info['version'];
        $installed_version = $this->getConfig()->get('installed_version');

        if (!$installed_version || version_compare($installed_version, $current_version, '<')) {
            $this->performUpdate($installed_version, $current_version);
        }
    }

    /**
     * Ensure API file is deployed to /api/
     *
     * Automatically copies markdown-preview.php from plugin directory to
     * /api/markdown-preview.php to avoid Apache "Deny from all" in /include/
     *
     * This eliminates the need for modifying osTicket core .htaccess files.
     */
    function ensureApiFileDeployed() {
        // Source: Plugin directory
        $source_file = __DIR__ . '/markdown-preview.php';

        // Target: /api/markdown-preview.php (same level as wildcard.php)
        // Use INCLUDE_DIR to get filesystem path (not ROOT_PATH which is URL path)
        $osticket_root = dirname(INCLUDE_DIR);
        $api_dir = $osticket_root . '/api';
        $target_file = $api_dir . '/markdown-preview.php';

        // Check if source exists
        if (!file_exists($source_file)) {
            error_log('[Markdown-Support] Warning: markdown-preview.php not found in plugin directory');
            return false;
        }

        // Check if API directory exists
        if (!is_dir($api_dir)) {
            error_log('[Markdown-Support] Error: /api directory not found');
            return false;
        }

        // Check if target exists and is up-to-date
        if (file_exists($target_file)) {
            // Compare file hashes to detect changes
            $source_hash = md5_file($source_file);
            $target_hash = md5_file($target_file);

            if ($source_hash === $target_hash) {
                // File already up-to-date
                return true;
            }
        }

        // Copy file to target location
        if (!@copy($source_file, $target_file)) {
            error_log('[Markdown-Support] Error: Cannot copy API file to ' . $target_file . ' - check permissions');
            return false;
        }

        // Set proper permissions
        @chmod($target_file, 0644);

        return true;
    }

    /**
     * Debug logging function (disabled - no longer functional)
     *
     * @param string $message Log message
     * @param string $level Log level (INFO, DEBUG, ERROR, WARNING)
     * @param array $context Additional context data
     * @deprecated Debug logging has been removed from production code
     */
    static function debugLog($message, $level = 'DEBUG', $context = []) {
        // No-op: Debug logging disabled
        // Kept for backward compatibility but does nothing
        return;
    }

    /**
     * Perform plugin update
     */
    function performUpdate($from_version, $to_version) {
        // Update /include/.htaccess to allow static assets
        $this->updateIncludeHtaccess();

        // Deploy/update API file to /api/ directory
        $this->ensureApiFileDeployed();

        // Save new version
        $this->getConfig()->set('installed_version', $to_version);
    }

    /**
     * Update /include/.htaccess to allow static assets for plugins
     * Supports both Apache 2.2 and 2.4 syntax
     */
    function updateIncludeHtaccess() {
        $htaccess_file = INCLUDE_DIR . '.htaccess';

        if (!file_exists($htaccess_file)) {
            error_log('[Markdown-Support] Warning: /include/.htaccess not found');
            return;
        }

        $htaccess_content = file_get_contents($htaccess_file);

        // Check if plugin PHP rule already exists
        if (strpos($htaccess_content, 'Allow PHP API endpoints in plugin directories') !== false) {
            return;
        }

        // Find insertion point - either Apache 2.4 style or 2.2 style
        // Look for the end of the deny block (either </IfModule> or "Deny from all")
        $pattern = null;
        if (preg_match('/(# Apache 2\.2\s+<IfModule !mod_authz_core\.c>.*?<\/IfModule>)/s', $htaccess_content)) {
            // Apache 2.4 compatible format with IfModule blocks
            $pattern = '/(# Apache 2\.2\s+<IfModule !mod_authz_core\.c>.*?<\/IfModule>)/s';
        } elseif (preg_match('/(Deny from all)/', $htaccess_content)) {
            // Old Apache 2.2 format
            $pattern = '/(Deny from all)/';
        }

        if (!$pattern || !preg_match($pattern, $htaccess_content)) {
            error_log('[Markdown-Support] Could not find insertion point in /include/.htaccess');
            return;
        }

        // Generate Apache 2.2 and 2.4 compatible rules
        $new_rule = "\n\n# Allow static assets and API endpoints for plugins\n";
        $new_rule .= "<FilesMatch \"\\.(js|css|map|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|otf)\$\">\n";
        $new_rule .= "    # Apache 2.4\n";
        $new_rule .= "    <IfModule mod_authz_core.c>\n";
        $new_rule .= "        Require all granted\n";
        $new_rule .= "    </IfModule>\n\n";
        $new_rule .= "    # Apache 2.2\n";
        $new_rule .= "    <IfModule !mod_authz_core.c>\n";
        $new_rule .= "        Order allow,deny\n";
        $new_rule .= "        Allow from all\n";
        $new_rule .= "    </IfModule>\n";
        $new_rule .= "</FilesMatch>\n\n";
        $new_rule .= "# Allow PHP API endpoints in plugin directories\n";
        $new_rule .= "<FilesMatch \"^plugins/.+\\.php\$\">\n";
        $new_rule .= "    # Apache 2.4\n";
        $new_rule .= "    <IfModule mod_authz_core.c>\n";
        $new_rule .= "        Require all granted\n";
        $new_rule .= "    </IfModule>\n\n";
        $new_rule .= "    # Apache 2.2\n";
        $new_rule .= "    <IfModule !mod_authz_core.c>\n";
        $new_rule .= "        Order allow,deny\n";
        $new_rule .= "        Allow from all\n";
        $new_rule .= "    </IfModule>\n";
        $new_rule .= "</FilesMatch>";

        $new_content = preg_replace(
            $pattern,
            "$1" . $new_rule,
            $htaccess_content,
            1 // Only replace first occurrence
        );

        if (!file_put_contents($htaccess_file, $new_content)) {
            error_log('[Markdown-Support] Failed to update .htaccess');
        }
    }

    /**
     * Called when plugin is enabled in admin panel
     */
    function enable() {
        $errors = array();

        // Auto-create instance for singleton plugin
        if ($this->isSingleton() && $this->getNumInstances() === 0) {
            $vars = array(
                'name' => $this->getName(),
                'isactive' => 1,
                'notes' => 'Auto-created singleton instance'
            );

            if (!$this->addInstance($vars, $errors)) {
                error_log(sprintf('[Markdown-Support] Failed to auto-create instance: %s',
                    json_encode($errors)));
                return $errors;
            }
        }

        // Update /include/.htaccess to allow static assets for plugins
        $this->updateIncludeHtaccess();

        // Deploy API file to /api/ directory
        $this->ensureApiFileDeployed();

        // Get current version from plugin.php
        $plugin_file = INCLUDE_DIR . 'plugins/' . basename(dirname(__FILE__)) . '/plugin.php';

        if (file_exists($plugin_file)) {
            $plugin_info = include($plugin_file);
            $this->getConfig()->set('installed_version', $plugin_info['version']);
        }

        return empty($errors) ? true : $errors;
    }

    /**
     * Called when plugin is disabled in admin panel
     */
    function disable() {
        // Restore original class.thread.php from backup
        $thread_file = INCLUDE_DIR . 'class.thread.php';
        $backup_file = $thread_file . '.markdown-backup';

        if (file_exists($backup_file)) {
            if (copy($backup_file, $thread_file)) {
                unlink($backup_file); // Remove backup after restore
            } else {
                error_log('[Markdown-Support] Error: Failed to restore backup');
            }
        }

        // Remove API file from /api/ directory
        $osticket_root = dirname(INCLUDE_DIR);
        $api_file = $osticket_root . '/api/markdown-preview.php';

        if (file_exists($api_file)) {
            if (!@unlink($api_file)) {
                error_log('[Markdown-Support] Warning: Could not remove API file: ' . $api_file);
            }
        }

        // Remove static assets rule from /include/.htaccess
        $htaccess_file = INCLUDE_DIR . '.htaccess';

        if (file_exists($htaccess_file)) {
            $htaccess_content = file_get_contents($htaccess_file);

            // Check if our rules exist
            if (strpos($htaccess_content, 'Allow static assets and API endpoints') !== false ||
                strpos($htaccess_content, 'Allow static assets for plugins') !== false) {
                // Remove all FilesMatch blocks we added (both old and new format)
                $pattern = '/\n\n# Allow static assets (and API endpoints )?for plugins.*?<\/FilesMatch>(\n\n# Allow PHP API endpoints.*?<\/FilesMatch>)?/s';
                $new_content = preg_replace($pattern, '', $htaccess_content);

                if (!file_put_contents($htaccess_file, $new_content)) {
                    error_log('[Markdown-Support] Failed to remove .htaccess rule');
                }
            }
        }

        return true;
    }

    /**
     * Signal handler for object.view
     *
     * Injects Markdown editor assets when viewing tickets
     * Note: This runs AFTER jQuery is loaded but BEFORE page rendering completes
     *
     * @param object $object The object being viewed (Ticket, Task, etc.)
     */
    function onObjectView($object) {
        // Only handle Ticket objects
        if (!($object instanceof Ticket)) {
            return;
        }

        // Inject assets (CSS/JS available, jQuery loaded at this point)
        $this->injectEditorAssets();
    }

    /**
     * Detect if we're on a page that needs the Markdown editor
     *
     * @return bool
     */
    function isEditorPage() {
        // Check for common editor pages
        $script = basename($_SERVER['SCRIPT_NAME']);
        $action = $_GET['a'] ?? '';

        // Pages that need the editor:
        // - tickets.php?a=open (New Ticket)
        // - tickets.php?id=123 (View Ticket with reply)
        // - tickets.php (Ticket listing page - might have quick reply)
        return $script === 'tickets.php'
            || $script === 'ticket.php'
            || ($script === 'ajax.php' && strpos($_SERVER['REQUEST_URI'], 'ticket') !== false);
    }

    /**
     * Signal handler for threadentry.created
     *
     * Post-processes thread entries for Markdown conversion
     *
     * @param ThreadEntry $entry The created thread entry
     */
    function onThreadEntryCreated($entry) {
        // CRITICAL FIX: Restore newlines that get stripped during osTicket's save process
        // osTicket's ThreadEntry save sometimes removes newlines from body content
        $body = $entry->getBody();

        // Check POST data for newlines and restore if they were lost
        $postBodyFields = array('response', 'note', 'message', 'body');
        foreach ($postBodyFields as $field) {
            if (isset($_POST[$field])) {
                $postBody = $_POST[$field];

                // If newlines are in POST but not in saved entry, restore them
                if (strpos($postBody, "\n") !== false && strpos($body, "\n") === false) {
                    // Update body directly in database with POST data
                    $sql = 'UPDATE ' . THREAD_ENTRY_TABLE .
                           ' SET body = ' . db_input($postBody) .
                           ' WHERE id = ' . db_input($entry->getId());

                    db_query($sql);
                }
                break; // Only check first matching field
            }
        }

        // Check if this entry should be markdown
        $format = null;

        // Check POST data (form submissions)
        if (isset($_POST['format'])) {
            $format = $_POST['format'];
        }

        // Check JSON body (API requests)
        // Only read JSON if we don't have format from POST and Content-Type is JSON
        if (!$format) {
            $content_type = $_SERVER['CONTENT_TYPE'] ?? '';

            if (strpos($content_type, 'application/json') !== false) {
                $json_input = file_get_contents('php://input');
                if ($json_input) {
                    $data = json_decode($json_input, true);
                    if (isset($data['format'])) {
                        $format = $data['format'];
                    }
                }
            }
        }

        // If markdown format detected, update entry
        if ($format === 'markdown') {
            // Get current format from entry
            $current_format = $entry->get('format');

            if ($current_format !== 'markdown') {
                // Update format directly in database
                $sql = 'UPDATE ' . THREAD_ENTRY_TABLE .
                       ' SET format = "markdown"' .
                       ' WHERE id = ' . db_input($entry->getId());

                if (!db_query($sql)) {
                    error_log("[Markdown-Support] Failed to update format: " . db_error());
                }
            }
        }

        // Auto-conversion: Detect and convert Markdown syntax automatically
        if ($this->getConfig()->get('auto_convert_to_markdown')) {
            // Only auto-detect if format was not explicitly set
            if (!isset($_POST['format']) || empty($_POST['format'])) {
                // Load TicketFormatHandler for auto-detection
                require_once __DIR__ . '/TicketFormatHandler.php';
                require_once __DIR__ . '/MarkdownDetector.php';

                // Prepare config for handler
                $config = array(
                    'auto_convert_to_markdown' => true,
                    'auto_detect_threshold' => 5, // 5% confidence minimum
                    'default_format' => $this->getConfig()->get('default_format') ?: 'html'
                );

                $handler = new TicketFormatHandler($config);

                // Check if we should convert to markdown
                $postBodyFields = array('response', 'note', 'message', 'body');
                foreach ($postBodyFields as $field) {
                    if (isset($_POST[$field])) {
                        $detectedFormat = $handler->determineFormat(array(
                            'message' => $_POST[$field]
                        ));

                        if ($detectedFormat === 'markdown') {
                            $current_format = $entry->get('format');

                            if ($current_format !== 'markdown') {
                                self::debugLog("Auto-detected Markdown syntax, converting entry #{$entry->getId()} from '{$current_format}' to 'markdown'", 'INFO');

                                // Update format to markdown
                                $sql = 'UPDATE ' . THREAD_ENTRY_TABLE .
                                       ' SET format = "markdown"' .
                                       ' WHERE id = ' . db_input($entry->getId());

                                db_query($sql);
                            }
                        }
                        break;
                    }
                }
            }
        }
    }

    /**
     * Hook for model.created signal - fixes format before save
     */
    function onModelCreated($model) {
        // This runs after the model is created, so we use onThreadEntryCreated instead
    }

    /**
     * Inject Markdown editor assets (JavaScript, CSS)
     *
     * CRITICAL: Assets are loaded on ALL pages for reliability.
     * - CSS MUST be in <head> to prevent FOUC (Flash of Unstyled Content)
     * - JS initializes intelligently (only on ticket pages)
     * - Total size: ~20KB (negligible performance impact)
     *
     * Why not use Signals?
     * - object.view: Too late (page already rendered, Redactor initialized)
     * - assets.ready: Does not exist in osTicket
     * - No osTicket signal fires BEFORE page render but ONLY on ticket pages
     */
    function injectEditorAssets() {
        // CRITICAL FIX: Use cached config from bootstrap instead of getConfig()
        // Signal callbacks get a new instance without proper config ID
        // So we read from static cache populated in bootstrap()
        if (self::$cached_config) {
            // Use cached values from bootstrap (has correct config ID)
            $default_format = self::$cached_config['default_format'] ?: 'markdown';
            $allow_format_switch = self::$cached_config['allow_format_switch'];
            $show_toolbar = self::$cached_config['show_toolbar'];
            $version = self::$cached_config['installed_version'];
        } else {
            // Fallback: Try to get config (might be empty instance)
            $config_obj = $this->getConfig();
            $default_format = $config_obj->get('default_format') ?: 'markdown';
            $allow_format_switch = $config_obj->get('allow_format_switch');
            $show_toolbar = $config_obj->get('show_toolbar');
            $version = $config_obj->get('installed_version');
        }

        // Build asset URLs with cache-busting
        $plugin_url = $this->getPluginUrl();
        $cache_param = $version ? '?v=' . urlencode($version) : '';
        $css_url = $plugin_url . '/css/markdown-editor.css' . $cache_param;
        $js_url = $plugin_url . '/js/markdown-editor.js' . $cache_param;

        // Inject config as global JavaScript variable (before editor JS loads)
        // Using PHP output instead of echo for better control
        $preview_api_url = ROOT_PATH . 'api/markdown-preview.php';
        ?>
<script>
window.osTicketMarkdownConfig = {
    defaultFormat: <?php echo json_encode($default_format); ?>,
    allowFormatSwitch: <?php echo json_encode((bool)$allow_format_switch); ?>,
    showToolbar: <?php echo json_encode((bool)$show_toolbar); ?>,
    previewApiUrl: <?php echo json_encode($preview_api_url); ?>
};
</script>
<link rel="stylesheet" href="<?php echo htmlspecialchars($css_url, ENT_QUOTES, 'UTF-8'); ?>">
<script defer src="<?php echo htmlspecialchars($js_url, ENT_QUOTES, 'UTF-8'); ?>"></script>
<?php
    }

    /**
     * Get plugin base URL
     *
     * @return string Plugin URL (e.g., /include/plugins/markdown-support)
     */
    function getPluginUrl() {
        $plugin_dir = basename(dirname(__FILE__));
        return ROOT_PATH . 'include/plugins/' . $plugin_dir;
    }

    /**
     * Get editor assets as HTML string
     *
     * Returns the same output as injectEditorAssets() but as a string
     * instead of directly echoing. Used in output buffer handler.
     *
     * @return string HTML with CSS/JS tags
     */
    function getEditorAssetsHtml() {
        // Get config values (same logic as injectEditorAssets)
        if (self::$cached_config) {
            $default_format = self::$cached_config['default_format'] ?: 'markdown';
            $allow_format_switch = self::$cached_config['allow_format_switch'];
            $show_toolbar = self::$cached_config['show_toolbar'];
            $version = self::$cached_config['installed_version'];
        } else {
            $config_obj = $this->getConfig();
            $default_format = $config_obj->get('default_format') ?: 'markdown';
            $allow_format_switch = $config_obj->get('allow_format_switch');
            $show_toolbar = $config_obj->get('show_toolbar');
            $version = $config_obj->get('installed_version');
        }

        // Build asset URLs
        $plugin_url = $this->getPluginUrl();
        $cache_param = $version ? '?v=' . urlencode($version) : '';
        $css_url = $plugin_url . '/css/markdown-editor.css' . $cache_param;
        $js_url = $plugin_url . '/js/markdown-editor.js' . $cache_param;
        $preview_api_url = ROOT_PATH . 'api/markdown-preview.php';

        // Build HTML as string
        $html = "<script>\n";
        $html .= "window.osTicketMarkdownConfig = {\n";
        $html .= "    defaultFormat: " . json_encode($default_format) . ",\n";
        $html .= "    allowFormatSwitch: " . json_encode((bool)$allow_format_switch) . ",\n";
        $html .= "    showToolbar: " . json_encode((bool)$show_toolbar) . ",\n";
        $html .= "    previewApiUrl: " . json_encode($preview_api_url) . "\n";
        $html .= "};\n";
        $html .= "</script>\n";
        $html .= "<link rel=\"stylesheet\" href=\"" . htmlspecialchars($css_url, ENT_QUOTES, 'UTF-8') . "\">\n";
        $html .= "<script src=\"" . htmlspecialchars($js_url, ENT_QUOTES, 'UTF-8') . "\"></script>\n";

        return $html;
    }

    /**
     * Output buffer callback to inject assets into HTML output
     *
     * This is used when we can't rely on object.view signal (e.g., New Ticket form)
     *
     * @param string $buffer HTML output buffer
     * @return string Modified HTML with injected assets
     */
    function injectAssetsIntoOutput($buffer) {
        // Only inject if we haven't already (prevent double injection)
        if (strpos($buffer, 'window.osTicketMarkdownConfig') !== false) {
            return $buffer;
        }

        // Get asset HTML as string (no ob_start needed!)
        $assets = $this->getEditorAssetsHtml();

        // Inject before </head> if possible, otherwise before </body>
        if (stripos($buffer, '</head>') !== false) {
            $buffer = str_ireplace('</head>', $assets . '</head>', $buffer);
        } elseif (stripos($buffer, '</body>') !== false) {
            $buffer = str_ireplace('</body>', $assets . '</body>', $buffer);
        } else {
            // No closing tags found, append to end
            $buffer .= $assets;
        }

        return $buffer;
    }
}
