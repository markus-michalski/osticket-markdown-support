/**
 * Text manipulation actions for the Markdown editor
 *
 * All formatting operations that work on textarea selection/content.
 */

import { debugLog } from './utils.js';

/**
 * Wraps selected text with prefix and suffix
 *
 * @param {object} editor - MarkdownEditor instance
 * @param {string} prefix - Text before selection
 * @param {string} suffix - Text after selection
 * @param {string} placeholder - Default text if nothing selected
 */
export function wrapSelection(editor, prefix, suffix, placeholder = '') {
    const textarea = editor.textarea[0];
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    const wrapped = prefix + (selection || placeholder) + suffix;
    textarea.value = text.substring(0, start) + wrapped + text.substring(end);

    const newCursorPos = start + prefix.length;
    textarea.setSelectionRange(
        newCursorPos,
        newCursorPos + (selection || placeholder).length
    );
    editor.textarea.trigger('input');
}

/**
 * Insert heading (cycles through H1-H6)
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function insertHeading(editor) {
    const textarea = editor.textarea[0];
    const start = textarea.selectionStart;
    const text = textarea.value;

    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineText = text.substring(lineStart, start);
    const hashMatch = lineText.match(/^(#{1,6})\s*/);

    let hashCount = hashMatch ? hashMatch[1].length : 0;
    hashCount = (hashCount % 6) + 1;
    const hashes = '#'.repeat(hashCount) + ' ';

    if (hashMatch) {
        const newText = text.substring(0, lineStart) + text.substring(lineStart).replace(/^#{1,6}\s*/, hashes);
        textarea.value = newText;
        textarea.setSelectionRange(start, start);
    } else {
        textarea.value = text.substring(0, lineStart) + hashes + text.substring(lineStart);
        textarea.setSelectionRange(start + hashes.length, start + hashes.length);
    }
    editor.textarea.trigger('input');
}

/**
 * Insert link with prompt
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function insertLink(editor) {
    const textarea = editor.textarea[0];
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    const linkText = selection || 'Link Text';
    const url = prompt('URL eingeben:', 'https://');
    if (url && url !== 'https://') {
        const link = `[${linkText}](${url})`;
        textarea.value = text.substring(0, start) + link + text.substring(end);
        const newPos = start + link.length;
        textarea.setSelectionRange(newPos, newPos);
        editor.textarea.trigger('input');
    }
}

/**
 * Insert code block with language prompt
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function insertCodeBlock(editor) {
    const language = prompt('Programmiersprache (optional):', 'javascript') || '';
    wrapSelection(editor, '```' + language + '\n', '\n```', 'code here');
}

/**
 * Insert list (ul or ol)
 *
 * @param {object} editor - MarkdownEditor instance
 * @param {string} type - 'ul' or 'ol'
 */
export function insertList(editor, type) {
    const textarea = editor.textarea[0];
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    const lines = selection ? selection.split('\n') : ['List Item'];
    const prefix = type === 'ul' ? '- ' : '1. ';
    const list = lines.map((line, index) => {
        if (type === 'ol') {
            return `${index + 1}. ${line}`;
        }
        return `${prefix}${line}`;
    }).join('\n');

    textarea.value = text.substring(0, start) + list + text.substring(end);
    const newPos = start + list.length;
    textarea.setSelectionRange(newPos, newPos);
    editor.textarea.trigger('input');
}

/**
 * Insert blockquote
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function insertBlockquote(editor) {
    const textarea = editor.textarea[0];
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    const lines = selection ? selection.split('\n') : ['Quote'];
    const quote = lines.map(line => `> ${line}`).join('\n');

    textarea.value = text.substring(0, start) + quote + text.substring(end);
    const newPos = start + quote.length;
    textarea.setSelectionRange(newPos, newPos);
    editor.textarea.trigger('input');
}

/**
 * Insert horizontal rule
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function insertHorizontalRule(editor) {
    const textarea = editor.textarea[0];
    const start = textarea.selectionStart;
    const text = textarea.value;

    const hr = '\n\n---\n\n';
    textarea.value = text.substring(0, start) + hr + text.substring(start);
    const newPos = start + hr.length;
    textarea.setSelectionRange(newPos, newPos);
    editor.textarea.trigger('input');
}

/**
 * Setup keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+H)
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function setupKeyboardShortcuts(editor) {
    editor.textarea.on('keydown', (e) => {
        const isMod = e.ctrlKey || e.metaKey;
        if (!isMod) return;

        switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                wrapSelection(editor, '**', '**', 'bold text');
                break;
            case 'i':
                e.preventDefault();
                wrapSelection(editor, '*', '*', 'italic text');
                break;
            case 'k':
                e.preventDefault();
                insertLink(editor);
                break;
            case 'h':
                e.preventDefault();
                insertHeading(editor);
                break;
        }
    });
}
