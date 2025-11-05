<?php

require_once __DIR__ . '/MarkdownDetector.php';

/**
 * Ticket Format Handler
 *
 * Determines the correct format (markdown/html/text) for ticket creation
 * based on explicit user selection, auto-detection, or default config.
 *
 * Priority:
 * 1. Explicit user selection ($_POST['format'])
 * 2. Auto-detection (if enabled in config)
 * 3. Default format from config
 */
class TicketFormatHandler
{
    /** @var array Configuration */
    private $config;

    /** @var MarkdownDetector Markdown detector instance */
    private $detector;

    /**
     * Constructor
     *
     * @param array|null $config Configuration array with keys:
     *                          - default_format: 'markdown'|'html'|'text'
     *                          - auto_detect_markdown: bool
     *                          - auto_detect_threshold: int (0-100)
     */
    public function __construct($config = null)
    {
        $this->config = $config ?: [
            'default_format' => 'html',
            'auto_detect_markdown' => false,
            'auto_detect_threshold' => 5
        ];

        $this->detector = new MarkdownDetector();
    }

    /**
     * Determine format based on POST data and configuration
     *
     * @param array $data POST data with keys:
     *                    - message: string (ticket body)
     *                    - format: string (optional, explicit format)
     * @return string 'markdown'|'html'|'text'
     */
    public function determineFormat(array $data)
    {
        // Priority 1: Explicit format selection (user choice wins)
        if (isset($data['format']) && !empty($data['format'])) {
            return $this->validateFormat($data['format']);
        }

        // Priority 2: Auto-detection (if enabled and message has markdown)
        if ($this->isAutoDetectionEnabled()) {
            $message = $data['message'] ?? '';

            if (!empty(trim($message))) {
                // Check if confidence exceeds threshold
                $threshold = $this->config['auto_detect_threshold'] ?? 5;

                if ($this->detector->hasMarkdownSyntax($message, $threshold)) {
                    return 'markdown';
                }
            }
        }

        // Priority 3: Default format from config
        return $this->getDefaultFormat();
    }

    /**
     * Check if auto-detection is enabled in config
     *
     * Supports both 'auto_detect_markdown' and 'auto_convert_to_markdown' (legacy)
     *
     * @return bool
     */
    private function isAutoDetectionEnabled()
    {
        // Support both config keys for backward compatibility
        return (isset($this->config['auto_detect_markdown']) && $this->config['auto_detect_markdown'] === true)
            || (isset($this->config['auto_convert_to_markdown']) && $this->config['auto_convert_to_markdown'] === true);
    }

    /**
     * Get default format from config
     *
     * @return string
     */
    private function getDefaultFormat()
    {
        $default = $this->config['default_format'] ?? 'html';
        return $this->validateFormat($default);
    }

    /**
     * Validate and sanitize format value
     *
     * @param string $format
     * @return string Valid format: 'markdown'|'html'|'text'
     */
    private function validateFormat($format)
    {
        $format = strtolower(trim($format));

        // Only allow valid formats
        $validFormats = ['markdown', 'html', 'text'];

        if (in_array($format, $validFormats)) {
            return $format;
        }

        // Invalid format, fallback to default
        return 'html';
    }

    /**
     * Get configuration value
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public function getConfig($key, $default = null)
    {
        return $this->config[$key] ?? $default;
    }

    /**
     * Set configuration value
     *
     * @param string $key
     * @param mixed $value
     * @return void
     */
    public function setConfig($key, $value)
    {
        $this->config[$key] = $value;
    }
}
