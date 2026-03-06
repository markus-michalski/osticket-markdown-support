/**
 * Toolbar creation and button definitions
 */

import { $ } from './globals.js';
import { getIcon } from './icons.js';

/**
 * Create the toolbar with all buttons
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function createToolbar(editor) {
    editor.toolbar = $('<div>', {
        class: 'markdown-toolbar',
        role: 'toolbar',
        'aria-label': 'Markdown Formatting Tools'
    });

    const skipInCompact = ['image'];

    editor.options.toolbarButtons.forEach(button => {
        if (editor.options.compact && skipInCompact.includes(button)) return;
        const btn = createToolbarButton(editor, button);
        if (btn) {
            editor.toolbar.append(btn);
        }
    });

    if (!editor.options.compact) {
        const previewToggle = createPreviewToggle(editor);
        editor.toolbar.append(previewToggle);
    }

    editor.container.prepend(editor.toolbar);
}

/**
 * Create a single toolbar button
 *
 * @param {object} editor - MarkdownEditor instance
 * @param {string} type - Button type identifier
 * @returns {jQuery|null} Button element or null
 */
function createToolbarButton(editor, type) {
    const buttons = {
        bold: {
            title: 'Bold (Ctrl+B)',
            icon: getIcon('bold'),
            action: () => editor.wrapSelection('**', '**', 'bold text')
        },
        italic: {
            title: 'Italic (Ctrl+I)',
            icon: getIcon('italic'),
            action: () => editor.wrapSelection('*', '*', 'italic text')
        },
        heading: {
            title: 'Heading (Ctrl+H)',
            icon: getIcon('heading'),
            action: () => editor.insertHeading()
        },
        link: {
            title: 'Link (Ctrl+K)',
            icon: getIcon('link'),
            action: () => editor.insertLink()
        },
        code: {
            title: 'Inline Code',
            icon: getIcon('code'),
            action: () => editor.wrapSelection('`', '`', 'code')
        },
        codeblock: {
            title: 'Code Block',
            icon: getIcon('codeblock'),
            action: () => editor.insertCodeBlock()
        },
        ul: {
            title: 'Unordered List',
            icon: getIcon('list-ul'),
            action: () => editor.insertList('ul')
        },
        ol: {
            title: 'Ordered List',
            icon: getIcon('list-ol'),
            action: () => editor.insertList('ol')
        },
        quote: {
            title: 'Blockquote',
            icon: getIcon('quote'),
            action: () => editor.insertBlockquote()
        },
        hr: {
            title: 'Horizontal Rule',
            icon: getIcon('hr'),
            action: () => editor.insertHorizontalRule()
        },
        image: {
            title: 'Insert Image',
            icon: getIcon('image'),
            action: () => editor._triggerImageFileDialog()
        }
    };

    const config = buttons[type];
    if (!config) return null;

    return $('<button>', {
        type: 'button',
        class: 'markdown-toolbar-btn',
        'data-action': type,
        title: config.title,
        'aria-label': config.title,
        html: config.icon,
        click: (e) => {
            e.preventDefault();
            config.action();
            editor.textarea.focus();
        }
    });
}

/**
 * Create the preview toggle button (mobile)
 *
 * @param {object} editor - MarkdownEditor instance
 * @returns {jQuery} Toggle button element
 */
function createPreviewToggle(editor) {
    return $('<button>', {
        type: 'button',
        class: 'markdown-preview-toggle',
        'data-action': 'toggle-preview',
        title: 'Toggle Preview',
        'aria-label': 'Toggle Preview',
        html: getIcon('eye'),
        click: (e) => {
            e.preventDefault();
            editor.togglePreview();
        }
    });
}
