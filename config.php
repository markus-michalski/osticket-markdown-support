<?php

// Only include osTicket classes if they exist (not in test environment)
if (defined('INCLUDE_DIR') && file_exists(INCLUDE_DIR . 'class.plugin.php')) {
    require_once INCLUDE_DIR . 'class.plugin.php';
}

/**
 * Markdown Support Plugin Configuration
 *
 * Configuration options for the Markdown Support plugin, allowing admins
 * to control Markdown functionality and behavior.
 */
class MarkdownConfig extends PluginConfig {

    /**
     * Translate strings (for i18n support)
     *
     * @param string $plugin Plugin identifier
     * @return array Translation functions
     */
    static function translate($plugin = 'markdown-support') {
        if (!method_exists('Plugin', 'translate')) {
            return array(
                function($x) { return $x; },
                function($x, $y, $n) { return $n != 1 ? $y : $x; },
            );
        }
        return Plugin::translate($plugin);
    }

    /**
     * Build configuration options
     *
     * @return array Configuration fields
     */
    function getOptions() {
        list($__, $_N) = self::translate();

        return array(
            // Main enable/disable toggle
            'enabled' => new BooleanField(array(
                'id' => 'enabled',
                'label' => $__('Enable Markdown Support'),
                'configuration' => array(
                    'desc' => $__('When enabled, Markdown formatting will be available for ticket threads. This adds the "markdown" type to ThreadEntryBody and enables Markdown-to-HTML rendering.')
                ),
                'default' => true
            )),

            // Default format for new thread entries
            'default_format' => new ChoiceField(array(
                'id' => 'default_format',
                'label' => $__('Default Thread Entry Format'),
                'configuration' => array(
                    'desc' => $__('Default format for new thread entries when replying to tickets. Users can switch between Markdown and HTML (WYSIWYG) using the editor dropdown.'),
                ),
                'choices' => array(
                    'html' => $__('HTML (WYSIWYG)'),
                    'markdown' => $__('Markdown')
                ),
                'default' => 'markdown'
            )),

            // Allow format switching in editor
            'allow_format_switch' => new BooleanField(array(
                'id' => 'allow_format_switch',
                'label' => $__('Allow Format Switching'),
                'configuration' => array(
                    'desc' => $__('Allow users to switch between HTML (WYSIWYG) and Markdown formats in the editor dropdown. If disabled, only the default format will be available.')
                ),
                'default' => true
            )),

            // Auto-convert detected Markdown to markdown type
            'auto_convert_to_markdown' => new BooleanField(array(
                'id' => 'auto_convert_to_markdown',
                'label' => $__('Auto-Convert Markdown Syntax'),
                'configuration' => array(
                    'desc' => $__('Automatically detect and convert Markdown syntax (e.g., # Heading, **bold**) to Markdown format when creating thread entries. This helps ensure proper rendering even if user forgets to select Markdown format.')
                ),
                'default' => false // Disabled by default for safety
            )),

            // Enable Markdown toolbar buttons
            'show_toolbar' => new BooleanField(array(
                'id' => 'show_toolbar',
                'label' => $__('Show Markdown Toolbar'),
                'configuration' => array(
                    'desc' => $__('Show a toolbar with Markdown formatting buttons (bold, italic, links, etc.) above the editor. This makes it easier for users who are not familiar with Markdown syntax.')
                ),
                'default' => true
            )),

            // Enable debug logging
            'enable_debug_logging' => new BooleanField(array(
                'id' => 'enable_debug_logging',
                'label' => $__('Enable Debug Logging'),
                'configuration' => array(
                    'desc' => $__('Enable detailed debug logging to file. Logs are written to include/plugins/markdown-support/log/YYYY-MM-DD-markdown.log. Enable only for troubleshooting - disable in production for performance.')
                ),
                'default' => false
            )),

            // Installed version (for auto-update tracking)
            'installed_version' => new TextboxField(array(
                'id' => 'installed_version',
                'label' => $__('Installed Version'),
                'configuration' => array(
                    'desc' => $__('Currently installed version (automatically updated)'),
                    'size' => 10,
                    'length' => 10
                ),
                'default' => '',
                // Read-only field
                'required' => false,
                'disabled' => true
            ))
        );
    }

    /**
     * Pre-save validation and processing
     *
     * @param array $config Configuration array (by reference)
     * @param array $errors Errors array (by reference)
     * @return bool True if valid
     */
    function pre_save(&$config = [], &$errors = []) {
        // Validate that if auto_convert is enabled, plugin must be enabled
        // Use $config (new values) instead of $this->get() (old values)

        // Get values with fallback to current config
        $auto_convert = isset($config['auto_convert_to_markdown'])
            ? $config['auto_convert_to_markdown']
            : $this->get('auto_convert_to_markdown');

        $enabled = isset($config['enabled'])
            ? $config['enabled']
            : $this->get('enabled');

        if ($auto_convert && !$enabled) {
            $errors['auto_convert_to_markdown'] = 'Auto-convert requires Markdown Support to be enabled';
            return false;
        }

        return true;
    }
}
