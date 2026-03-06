/**
 * Live preview functionality
 */

import { $ } from './globals.js';
import { debugLog } from './utils.js';

/**
 * Create the preview pane
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function createPreview(editor) {
    editor.textarea.closest('td').find('.markdown-preview-container').remove();
    debugLog('Removed all existing preview containers', 'DEBUG');

    const previewContainer = $('<div>', {
        class: 'markdown-preview-container'
    });

    const previewHeader = $('<div>', {
        class: 'markdown-preview-header',
        html: '<span>Preview</span>'
    });

    editor.previewPane = $('<div>', {
        class: 'markdown-preview',
        'aria-live': 'polite',
        'aria-label': 'Markdown Preview'
    });

    previewContainer.append(previewHeader, editor.previewPane);

    if (editor.options.previewPosition === 'side') {
        editor.container.addClass('preview-side');
        const contentArea = $('<div>', {
            class: 'markdown-content-area'
        });
        editor.textarea.parent().wrap(contentArea);
        editor.textarea.parent().parent().append(previewContainer);
    } else {
        editor.container.addClass('preview-bottom');
        editor.textarea.parent().after(previewContainer);
    }

    debugLog('Created new preview container', 'DEBUG');
}

/**
 * Setup live preview with debouncing
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function setupLivePreview(editor) {
    editor.textarea.on('input', () => {
        clearTimeout(editor.debounceTimer);
        editor.debounceTimer = setTimeout(() => {
            renderPreview(editor);
        }, editor.options.debounceDelay);
    });
}

/**
 * Render the Markdown preview
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function renderPreview(editor) {
    if (!editor.previewPane) return;

    const markdown = editor.textarea.val();
    if (!markdown.trim()) {
        editor.previewPane.html('<p class="preview-empty">Preview wird hier angezeigt...</p>');
        return;
    }

    const config = window.osTicketMarkdownConfig || {};
    const previewApiUrl = config.previewApiUrl;

    if (previewApiUrl) {
        debugLog('Rendering preview via backend API', 'DEBUG', { url: previewApiUrl });
        $.ajax({
            url: previewApiUrl,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ markdown }),
            dataType: 'json',
            success: (response) => {
                if (response.success && response.html) {
                    debugLog('Backend preview rendered successfully', 'DEBUG');
                    editor.previewPane.html(response.html);
                } else {
                    debugLog('Backend preview failed: Invalid response', 'ERROR', response);
                    fallbackToClientPreview(editor, markdown);
                }
            },
            error: (xhr, status, error) => {
                debugLog('Backend preview failed: ' + error, 'ERROR', { status, xhr });
                fallbackToClientPreview(editor, markdown);
            }
        });
    } else {
        debugLog('No backend API configured - using client-side preview', 'WARN');
        fallbackToClientPreview(editor, markdown);
    }
}

/**
 * Fallback to client-side preview
 *
 * @param {object} editor - MarkdownEditor instance
 * @param {string} markdown - Raw markdown text
 */
function fallbackToClientPreview(editor, markdown) {
    debugLog('Using client-side preview fallback', 'DEBUG');
    const html = simpleMarkdownToHtml(markdown);
    editor.previewPane.html(html);
}

/**
 * Simple client-side Markdown-to-HTML converter (fallback)
 *
 * @param {string} markdown - Raw markdown text
 * @returns {string} HTML string
 */
function simpleMarkdownToHtml(markdown) {
    let html = markdown;

    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    html = html.replace(/^\* (.+)$/gim, '___UL___<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gim, '___OL___<li>$1</li>');
    html = html.replace(/(___UL___<li>.*<\/li>\n?)+/g, function(match) {
        return '<ul>' + match.replace(/___UL___/g, '') + '</ul>';
    });
    html = html.replace(/(___OL___<li>.*<\/li>\n?)+/g, function(match) {
        return '<ol>' + match.replace(/___OL___/g, '') + '</ol>';
    });
    html = html.replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    if (!html.match(/^<(h\d|ul|ol|pre|blockquote)/)) {
        html = '<p>' + html + '</p>';
    }

    return html;
}

/**
 * Toggle preview visibility (mobile)
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function togglePreview(editor) {
    editor.container.toggleClass('preview-hidden');
}
