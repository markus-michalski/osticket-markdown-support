<?php
/**
 * AJAX Log Handler for Markdown Support Plugin
 *
 * Receives JavaScript log messages via POST and writes them to the debug log.
 * JavaScript only calls this when debug logging is enabled.
 */

// Security: Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die('Method Not Allowed');
}

// Get POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['message'])) {
    http_response_code(400);
    die('Invalid request');
}

$message = $data['message'];
$level = $data['level'] ?? 'DEBUG';
$context = $data['context'] ?? [];

// Ensure context is always an array (could be string from JS)
if (!is_array($context)) {
    $context = ['raw' => $context];
}

// Add client info to context
$context['client'] = [
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
];

// Write directly to log file (standalone function - no dependencies)
$log_dir = __DIR__ . '/log';

// Ensure log directory exists
if (!is_dir($log_dir)) {
    @mkdir($log_dir, 0755, true);
}

// Create log file path with date
$log_file = $log_dir . '/' . date('Y-m-d') . '-markdown.log';

// Format log entry
$timestamp = date('Y-m-d H:i:s');
$context_str = !empty($context) ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
$log_entry = sprintf("[%s] [%s] [JS] %s%s\n", $timestamp, $level, $message, $context_str);

// Write to log file (append mode)
$success = @file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);

// Return success
if ($success !== false) {
    http_response_code(200);
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to write log']);
}
