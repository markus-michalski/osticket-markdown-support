<?php

namespace MarkdownSupport\Tests\Mocks;

/**
 * Mock osTicket Classes for Testing
 *
 * These mocks allow testing the Markdown plugin without requiring
 * a full osTicket installation.
 */

/**
 * Mock Plugin base class
 */
class Plugin {
    protected $config;
    protected $instances = [];

    public function __construct() {
        $this->config = new PluginConfig();
    }

    public function getConfig() {
        return $this->config;
    }

    public function getName() {
        return 'Markdown Support';
    }

    public function isSingleton() {
        return true;
    }

    public function getNumInstances() {
        return count($this->instances);
    }

    public function addInstance($vars, &$errors) {
        $this->instances[] = $vars;
        return true;
    }

    public function bootstrap() {
        // Override in child classes
    }

    public function enable() {
        return true;
    }

    public function disable() {
        return true;
    }
}

// Make Plugin available globally for class.MarkdownPlugin.php
if (!class_exists('Plugin', false)) {
    class_alias(Plugin::class, 'Plugin');
}

/**
 * Mock PluginConfig class
 */
class PluginConfig {
    private $config = [
        'enabled' => true,
        'installed_version' => '1.0.0',
        'auto_convert_to_markdown' => false,
        'default_format' => 'markdown',
        'allow_format_switch' => true,
        'show_preview' => true,
        'show_toolbar' => true,
    ];

    public function get($key) {
        return $this->config[$key] ?? null;
    }

    public function set($key, $value) {
        $this->config[$key] = $value;
    }

    public function getForm() {
        return new MockForm();
    }

    public function pre_save(&$config = [], &$errors = []) {
        return true;
    }

    public function getOptions() {
        return [];
    }
}

// Make PluginConfig available globally
if (!class_exists('PluginConfig', false)) {
    class_alias(PluginConfig::class, 'PluginConfig');
}

/**
 * Mock Form class (for PluginConfig validation)
 */
class MockForm {
    public function getField($name) {
        return new MockFormField();
    }
}

/**
 * Mock FormField class
 */
class MockFormField {
    public function addError($message) {
        // No-op in mock
    }
}

/**
 * Mock BooleanField class
 */
class BooleanField extends MockFormField {
    private $config;

    public function __construct($config) {
        $this->config = $config;
    }
}

if (!class_exists('BooleanField', false)) {
    class_alias(BooleanField::class, 'BooleanField');
}

/**
 * Mock ChoiceField class
 */
class ChoiceField extends MockFormField {
    private $config;

    public function __construct($config) {
        $this->config = $config;
    }
}

if (!class_exists('ChoiceField', false)) {
    class_alias(ChoiceField::class, 'ChoiceField');
}

/**
 * Mock TextboxField class
 */
class TextboxField extends MockFormField {
    private $config;

    public function __construct($config) {
        $this->config = $config;
    }
}

if (!class_exists('TextboxField', false)) {
    class_alias(TextboxField::class, 'TextboxField');
}

/**
 * Mock VisibilityConstraint class
 */
class VisibilityConstraint {
    const HIDDEN = 1;

    public function __construct($query, $visibility) {
        // No-op in mock
    }
}

if (!class_exists('VisibilityConstraint', false)) {
    class_alias(VisibilityConstraint::class, 'VisibilityConstraint');
}

/**
 * Mock Q class (query builder)
 */
class Q {
    public function __construct($conditions) {
        // No-op in mock
    }
}

if (!class_exists('Q', false)) {
    class_alias(Q::class, 'Q');
}

/**
 * Mock ThreadEntryBody base class
 */
class ThreadEntryBody {
    protected $body;
    protected $type;
    protected $options;

    // Static array of supported types (will be extended by plugin)
    static $types = ['text', 'html'];

    public function __construct($body, $type='text', $options=array()) {
        $this->body = $body;
        $this->type = $type;
        $this->options = $options;
    }

    public function getBody() {
        return $this->body;
    }

    public function getType() {
        return $this->type;
    }

    public function display($output=false) {
        return $this->body;
    }

    public function toHtml() {
        return $this->body;
    }

    public function getSearchable() {
        return strip_tags($this->body);
    }

    public function getClean() {
        return $this->body;
    }

    public function getOriginal() {
        return $this->body;
    }

    public function isEmpty() {
        return empty(trim($this->body));
    }
}

// Make ThreadEntryBody available globally
if (!class_exists('ThreadEntryBody', false)) {
    class_alias(ThreadEntryBody::class, 'ThreadEntryBody');
}

/**
 * Mock Format utility class (osTicket's HTML sanitization)
 */
class Format {
    /**
     * Sanitize HTML to prevent XSS attacks
     *
     * Mimics osTicket's Format::sanitize() behavior:
     * - Removes javascript: URLs (including URL-encoded variants)
     * - Strips dangerous event handlers (onclick, onerror, etc.)
     * - Removes dangerous HTML tags (<script>, <iframe>, etc.)
     *
     * @param string $html HTML to sanitize
     * @return string Sanitized HTML
     */
    public static function sanitize($html) {
        // Remove javascript: URLs (including URL-encoded variants)
        $html = preg_replace('/javascript\s*:/i', '', $html);
        $html = preg_replace('/java%09script\s*:/i', '', $html);
        $html = preg_replace('/java%0[ad]script\s*:/i', '', $html);
        $html = preg_replace('/java%20script\s*:/i', '', $html);

        // Remove data: URLs (can contain malicious scripts)
        $html = preg_replace('/data\s*:[^"\'>\s]+/i', '', $html);

        // Remove dangerous event handlers
        $html = preg_replace('/\s*on\w+\s*=\s*["\'][^"\']*["\']/i', '', $html);
        $html = preg_replace('/\s*on\w+\s*=\s*[^\s>]+/i', '', $html);

        // Remove dangerous tags
        $dangerous_tags = ['script', 'iframe', 'object', 'embed', 'applet', 'meta', 'link', 'style', 'form'];
        foreach ($dangerous_tags as $tag) {
            $html = preg_replace('/<' . $tag . '[^>]*>.*?<\/' . $tag . '>/is', '', $html);
            $html = preg_replace('/<' . $tag . '[^>]*\/?>/is', '', $html);
        }

        return $html;
    }

    /**
     * HTML entity encoding
     *
     * @param string $text Text to encode
     * @return string Encoded text
     */
    public static function htmlchars($text) {
        return htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * Convert HTML to plain text
     *
     * @param string $html HTML to convert
     * @return string Plain text
     */
    public static function html2text($html) {
        // Remove HTML tags
        $text = strip_tags($html);

        // Decode HTML entities
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Normalize whitespace
        $text = preg_replace('/\s+/', ' ', $text);

        return trim($text);
    }
}

// Make Format available globally
if (!class_exists('Format', false)) {
    class_alias(Format::class, 'Format');
}

/**
 * Mock Signal system (osTicket's event system)
 */
class Signal {
    private static $handlers = [];

    public static function connect($signal, $callback) {
        if (!isset(self::$handlers[$signal])) {
            self::$handlers[$signal] = [];
        }
        self::$handlers[$signal][] = $callback;
    }

    public static function send($signal, ...$args) {
        if (!isset(self::$handlers[$signal])) {
            return;
        }

        foreach (self::$handlers[$signal] as $callback) {
            call_user_func_array($callback, $args);
        }
    }

    public static function getHandlers($signal) {
        return self::$handlers[$signal] ?? [];
    }

    public static function clearHandlers($signal = null) {
        if ($signal === null) {
            self::$handlers = [];
        } else {
            self::$handlers[$signal] = [];
        }
    }
}

// Make Signal available globally
if (!class_exists('Signal', false)) {
    class_alias(Signal::class, 'Signal');
}

/**
 * Mock Ticket class
 */
class Ticket {
    private $id;
    private $number;

    public function __construct($id = 1, $number = 'ABC-123') {
        $this->id = $id;
        $this->number = $number;
    }

    public function getId() {
        return $this->id;
    }

    public function getNumber() {
        return $this->number;
    }
}

// Make Ticket available globally
if (!class_exists('Ticket', false)) {
    class_alias(Ticket::class, 'Ticket');
}
