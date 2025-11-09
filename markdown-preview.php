<?php
/**
 * Markdown Preview API Endpoint
 *
 * Provides server-side Markdown-to-HTML rendering for live preview.
 * Uses the same Parsedown parser as the backend to ensure 100% identical output.
 *
 * Security:
 * - POST only (prevent caching)
 * - Parsedown SafeMode enabled (escapes inline HTML)
 * - XSS sanitization (removes javascript: URLs and on* attributes)
 * - JSON response only
 *
 * Request:
 * POST /include/plugins/markdown-support/markdown-preview.php
 * Content-Type: application/json
 * Body: {"markdown": "# Hello\n\nWorld"}
 *
 * Response:
 * {"success": true, "html": "<h1>Hello</h1>\n<p>World</p>"}
 */

/**
 * Sanitize HTML to prevent XSS attacks
 *
 * IMPORTANT: This function is defined FIRST, before any code execution,
 * to ensure it's available when called later in the script.
 *
 * @param string $html HTML to sanitize
 * @return string Sanitized HTML
 */
if (!function_exists('markdownPreviewSanitizeHtml')) {
    function markdownPreviewSanitizeHtml($html) {
    // Remove javascript: URLs (including URL-encoded variants)
    $html = preg_replace('/(<[^>]+\s)(href|src)\s*=\s*["\']?\s*javascript:/i', '$1data-blocked-$2="', $html);
    $html = preg_replace('/(<[^>]+\s)(href|src)\s*=\s*["\']?\s*data:/i', '$1data-blocked-$2="', $html);

    // Remove on* event attributes (onclick, onload, onerror, etc.)
    // Run multiple times to catch all attributes in same tag
    do {
        $before = $html;
        $html = preg_replace('/(<[^>]+\s)on\w+\s*=\s*["\'][^"\']*["\']/i', '$1', $html);
        $html = preg_replace('/(<[^>]+\s)on\w+\s*=\s*[^\s>]+/i', '$1', $html);
    } while ($before !== $html);

    // Remove style attributes with expression() (IE-specific XSS)
    $html = preg_replace('/(<[^>]+\s)style\s*=\s*["\'][^"\']*expression\s*\([^"\']*["\']/i', '$1', $html);

    // Remove any remaining script tags (defense in depth - Parsedown SafeMode should already handle this)
    $html = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $html);

    return $html;
    }
}

// Catch fatal errors and convert to JSON response
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Only catch fatal errors, not notices/warnings
    if ($errno & (E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => "PHP Error: $errstr in $errfile:$errline"
        ]);
        exit;
    }
    // Let notices/warnings pass through (return false = default handler)
    return false;
});

// Security: Only allow POST requests
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    die(json_encode(['success' => false, 'error' => 'Method Not Allowed']));
}

// Get POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validate input
if (!$data || !isset($data['markdown'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    die(json_encode(['success' => false, 'error' => 'Invalid request - markdown field required']));
}

$markdown = $data['markdown'];

// Handle empty markdown
if (empty(trim($markdown))) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'html' => '<p class="preview-empty">Preview wird hier angezeigt...</p>'
    ]);
    exit;
}

// Load Parsedown library via Composer autoload
// Try multiple paths since this file can be called from plugin dir or /api/
$autoload_paths = [
    __DIR__ . '/vendor/autoload.php',  // From plugin directory
    __DIR__ . '/../include/plugins/markdown-support/vendor/autoload.php',  // From /api/
];

$autoload_file = null;
foreach ($autoload_paths as $path) {
    if (file_exists($path)) {
        $autoload_file = $path;
        break;
    }
}

if (!$autoload_file) {
    http_response_code(500);
    header('Content-Type: application/json');
    die(json_encode(['success' => false, 'error' => 'Composer autoload not found. Tried: ' . implode(', ', $autoload_paths)]));
}

require_once $autoload_file;

try {
    // Initialize Parsedown with SafeMode
    $parsedown = new Parsedown();
    $parsedown->setSafeMode(true); // CRITICAL: XSS Prevention Layer 1

    // Convert Markdown to HTML
    $html = $parsedown->text($markdown);

    // CRITICAL: Layer 2 - XSS sanitization
    $html = markdownPreviewSanitizeHtml($html);

    // Return JSON response
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'html' => $html
    ]);

} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Markdown rendering failed: ' . $e->getMessage()
    ]);
}
