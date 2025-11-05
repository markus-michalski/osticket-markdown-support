<?php

/**
 * PHPUnit Bootstrap File for Markdown Support Plugin Tests
 *
 * Loads dependencies and sets up mocks for osTicket classes
 * to allow testing without a full osTicket installation.
 */

// Autoload Composer dependencies
$autoloader = require __DIR__ . '/../vendor/autoload.php';

// Define osTicket constants if not already defined (BEFORE loading mocks)
if (!defined('INCLUDE_DIR')) {
    define('INCLUDE_DIR', __DIR__ . '/mocks/osticket/');
}

if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', '/');
}

// Load osTicket mock classes FIRST (before plugin classes)
require_once __DIR__ . '/Mocks/OsTicketMocks.php';

// Load Parsedown library (required for MarkdownThreadEntryBody)
require_once __DIR__ . '/../vendor/Parsedown.php';

// Load plugin classes (will use mocks for osTicket dependencies)
require_once __DIR__ . '/../class.MarkdownPlugin.php';
require_once __DIR__ . '/../markdown-body.php';

// Set error reporting for tests
error_reporting(E_ALL);
ini_set('display_errors', '1');

echo "✓ Markdown Support Plugin Test Bootstrap loaded\n";
