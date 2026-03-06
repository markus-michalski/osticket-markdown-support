/**
 * Format switcher UI (Markdown/HTML dropdown)
 */

import { $ } from './globals.js';
import { debugLog } from './utils.js';

/**
 * Create standalone format switcher (placed before textarea)
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function createFormatSwitcherStandalone(editor) {
    const $wrapper = $('<div>', {
        class: 'markdown-format-switcher-wrapper',
        css: {
            'display': 'block',
            'width': '100%',
            'margin-bottom': '10px',
            'clear': 'both',
            'padding': '5px 0'
        }
    });

    const $label = $('<label>', {
        text: 'Format: ',
        css: {
            'font-weight': 'bold',
            'margin-right': '10px',
            'display': 'inline-block'
        }
    });

    const $select = $('<select>', {
        class: 'format-switcher-select',
        'aria-label': 'Select input format',
        css: {
            'padding': '1px 30px 6px 10px',
            'border': '1px solid #ccc',
            'border-radius': '4px',
            'font-size': '14px',
            'min-width': '150px',
            'background-color': '#fff'
        },
        change: (e) => editor.switchFormat(e.target.value)
    });

    const formats = [
        { value: 'markdown', label: 'Markdown' },
        { value: 'html', label: 'HTML' }
    ];

    formats.forEach(format => {
        $select.append($('<option>', {
            value: format.value,
            text: format.label,
            selected: format.value === editor.currentFormat
        }));
    });

    $wrapper.append($label).append($select);
    editor.textarea.before($wrapper);
    editor.formatSwitcher = $wrapper;
    editor.formatSwitcherSelect = $select;

    debugLog('Created standalone format switcher before textarea', 'DEBUG');
}

/**
 * Create format switcher for toolbar integration (legacy)
 *
 * @param {object} editor - MarkdownEditor instance
 * @returns {jQuery} Switcher element
 */
export function createFormatSwitcher(editor) {
    const switcher = $('<div>', {
        class: 'format-switcher'
    });

    const select = $('<select>', {
        class: 'format-switcher-select',
        'aria-label': 'Select input format',
        change: (e) => editor.switchFormat(e.target.value)
    });

    const formats = [
        { value: 'markdown', label: 'Markdown' },
        { value: 'html', label: 'HTML' }
    ];

    formats.forEach(format => {
        select.append($('<option>', {
            value: format.value,
            text: format.label,
            selected: format.value === editor.currentFormat
        }));
    });

    switcher.append(select);
    return switcher;
}

/**
 * Ensure a hidden format field exists and is set to current format
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function ensureFormatField(editor) {
    const textareaName = editor.textarea.attr('name');
    let formatField = editor.textarea.closest('form').find('input[name="format"]');

    if (formatField.length === 0) {
        formatField = editor.textarea.closest('form').find(`input[name="format[${textareaName}]"]`);
    }

    if (formatField.length === 0) {
        formatField = $('<input>', {
            type: 'hidden',
            name: 'format',
            value: editor.currentFormat
        });
        editor.textarea.after(formatField);
        debugLog(`Created format field with value "${editor.currentFormat}"`, 'DEBUG');
    } else {
        formatField.val(editor.currentFormat);
        debugLog(`Updated existing format field to "${editor.currentFormat}"`, 'DEBUG');
    }

    editor.formatField = formatField;
}
