/**
 * Utility functions shared across modules
 */

import { DEBUG } from './globals.js';

/**
 * Debug logging function (browser console only)
 *
 * Logging is DISABLED in production by default (DEBUG = false).
 * Only ERROR and WARNING messages are always shown for critical issues.
 *
 * @param {string} message - Log message
 * @param {string} level - Log level (DEBUG, INFO, WARNING, ERROR)
 * @param {object} context - Additional context data
 */
export function debugLog(message, level = 'DEBUG', context = {}) {
    if (!DEBUG && (level === 'DEBUG' || level === 'INFO')) {
        return;
    }
    if (typeof console === 'undefined') {
        return;
    }

    const prefix = `[Markdown Editor ${level}]`;

    if (Object.keys(context).length > 0) {
        switch (level) {
            case 'ERROR':
                console.error(prefix, message, context);
                break;
            case 'WARNING':
                console.warn(prefix, message, context);
                break;
            case 'INFO':
                console.info(prefix, message, context);
                break;
            default:
                console.log(prefix, message, context);
        }
    } else {
        switch (level) {
            case 'ERROR':
                console.error(prefix, message);
                break;
            case 'WARNING':
                console.warn(prefix, message);
                break;
            case 'INFO':
                console.info(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }
    }
}

/**
 * Insert text at current cursor position in textarea
 *
 * @param {object} editor - MarkdownEditor instance
 * @param {string} text - Text to insert
 */
export function insertTextAtCursor(editor, text) {
    const textarea = editor.textarea[0];
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    let prefix = '';
    if (start > 0 && value[start - 1] !== '\n') {
        prefix = '\n';
    }

    let suffix = '';
    if (end < value.length && value[end] !== '\n') {
        suffix = '\n';
    }

    const insertText = prefix + text + suffix;
    textarea.value = value.substring(0, start) + insertText + value.substring(end);

    const newPos = start + insertText.length;
    textarea.setSelectionRange(newPos, newPos);
    editor.textarea.trigger('input');
}

/**
 * Replace placeholder text in textarea
 *
 * @param {object} editor - MarkdownEditor instance
 * @param {string} placeholder - Text to find and replace
 * @param {string} replacement - Replacement text
 */
export function replacePlaceholder(editor, placeholder, replacement) {
    const textarea = editor.textarea[0];
    const value = textarea.value;
    const index = value.indexOf(placeholder);

    if (index === -1) {
        debugLog('Placeholder not found in textarea', 'WARNING');
        return;
    }

    textarea.value = value.substring(0, index) + replacement + value.substring(index + placeholder.length);
    const newPos = index + replacement.length;
    textarea.setSelectionRange(newPos, newPos);
    editor.textarea.trigger('input');
}
