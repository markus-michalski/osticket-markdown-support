/**
 * MarkdownEditor - Core class
 *
 * Orchestrates all modules and holds shared state.
 */

import { $ } from './globals.js';
import { debugLog } from './utils.js';
import { createToolbar } from './toolbar.js';
import { createPreview, setupLivePreview, renderPreview, togglePreview } from './preview.js';
import { createFormatSwitcherStandalone, createFormatSwitcher, ensureFormatField } from './format-switcher.js';
import { destroyRedactor, restoreRedactor, setupRedactorProtection } from './redactor-bridge.js';
import { setupImageUpload, teardownImageUploadHandlers, triggerImageFileDialog, showUploadError } from './image-upload.js';
import { setupCannedResponseHandler, htmlToMarkdown } from './canned-response.js';
import {
    wrapSelection, insertHeading, insertLink, insertCodeBlock,
    insertList, insertBlockquote, insertHorizontalRule, setupKeyboardShortcuts
} from './text-actions.js';

export class MarkdownEditor {

    constructor(textarea, options = {}) {
        this.textarea = $(textarea);

        const globalConfig = window.osTicketMarkdownConfig || {};

        debugLog('Global config received', 'DEBUG', globalConfig);
        debugLog('Default format from config: ' + globalConfig.defaultFormat, 'DEBUG');

        this.options = $.extend({
            showToolbar: globalConfig.showToolbar !== undefined ? globalConfig.showToolbar : true,
            allowFormatSwitch: globalConfig.allowFormatSwitch !== undefined ? globalConfig.allowFormatSwitch : true,
            previewPosition: 'bottom',
            debounceDelay: 500,
            toolbarButtons: [
                'bold', 'italic', 'heading', 'link', 'code',
                'codeblock', 'ul', 'ol', 'quote', 'hr', 'image'
            ],
            shortcuts: true,
            autoInit: true,
            compact: false
        }, options);

        this.container = null;
        this.toolbar = null;
        this.previewPane = null;
        this.debounceTimer = null;
        this.currentFormat = globalConfig.defaultFormat || 'markdown';

        debugLog('Current format set to: ' + this.currentFormat, 'INFO');
        debugLog('Editor options', 'DEBUG', this.options);

        if (this.options.autoInit) {
            this.init();
        }
    }

    init() {
        debugLog('Initializing editor for textarea: ' + this.textarea.attr('id'), 'INFO');
        debugLog('Current format: ' + this.currentFormat, 'DEBUG');

        if (this.currentFormat !== 'html') {
            debugLog('Destroying Redactor (not HTML format)', 'DEBUG');
            this.destroyRedactor();
        } else {
            debugLog('Keeping Redactor (HTML format)', 'DEBUG');
        }

        if (this.options.allowFormatSwitch) {
            this.createFormatSwitcherStandalone();
        }

        if (this.currentFormat !== 'html') {
            this.createContainer();
        }

        if (this.options.showToolbar && this.currentFormat !== 'html') {
            this.createToolbar();
        }

        if (this.currentFormat === 'markdown' && !this.options.compact) {
            this.createPreview();
            this.setupLivePreview();
        }

        if (this.options.shortcuts && this.currentFormat === 'markdown') {
            this.setupKeyboardShortcuts();
        }

        if (this.currentFormat === 'markdown' && !this.options.compact) {
            this.setupImageUpload();
        }

        this.setupCannedResponseHandler();

        if (this.currentFormat === 'markdown' && this.textarea.val().trim()) {
            this.renderPreview();
        }

        debugLog('Editor initialized successfully', 'DEBUG');
    }

    // -- Container --

    createContainer() {
        const containerClass = 'markdown-editor-container' + (this.options.compact ? ' markdown-compact' : '');
        this.container = $('<div>', {
            class: containerClass,
            'data-format': this.currentFormat
        });
        this.textarea.wrap(this.container);
        this.container = this.textarea.parent();

        const editorWrapper = $('<div>', {
            class: 'markdown-editor-wrapper'
        });
        this.textarea.wrap(editorWrapper);
        this.textarea.addClass('markdown-textarea');

        this.ensureFormatField();
    }

    // -- Delegated module methods --

    // Redactor bridge
    destroyRedactor() { destroyRedactor(this); }
    restoreRedactor() { restoreRedactor(this); }
    setupRedactorProtection() { setupRedactorProtection(this); }

    // Toolbar
    createToolbar() { createToolbar(this); }

    // Preview
    createPreview() { createPreview(this); }
    setupLivePreview() { setupLivePreview(this); }
    renderPreview() { renderPreview(this); }
    togglePreview() { togglePreview(this); }

    // Format switcher
    createFormatSwitcherStandalone() { createFormatSwitcherStandalone(this); }
    createFormatSwitcher() { return createFormatSwitcher(this); }
    ensureFormatField() { ensureFormatField(this); }

    // Text actions
    wrapSelection(prefix, suffix, placeholder) { wrapSelection(this, prefix, suffix, placeholder); }
    insertHeading() { insertHeading(this); }
    insertLink() { insertLink(this); }
    insertCodeBlock() { insertCodeBlock(this); }
    insertList(type) { insertList(this, type); }
    insertBlockquote() { insertBlockquote(this); }
    insertHorizontalRule() { insertHorizontalRule(this); }
    setupKeyboardShortcuts() { setupKeyboardShortcuts(this); }

    // Image upload
    setupImageUpload() { setupImageUpload(this); }
    _teardownImageUploadHandlers() { teardownImageUploadHandlers(this); }
    _triggerImageFileDialog() { triggerImageFileDialog(this); }
    _showUploadError(msg) { showUploadError(this, msg); }

    // Canned response
    setupCannedResponseHandler() { setupCannedResponseHandler(this); }
    htmlToMarkdown(html) { return htmlToMarkdown(html); }

    // -- Format switching (orchestrator) --

    switchFormat(newFormat) {
        debugLog('Switching format from ' + this.currentFormat + ' to ' + newFormat, 'INFO');

        const oldFormat = this.currentFormat;
        this.currentFormat = newFormat;
        this.container.attr('data-format', newFormat);

        if (this.formatField) {
            this.formatField.val(newFormat);
            debugLog('Updated format field to: ' + newFormat, 'DEBUG');
        }

        this.textarea.removeClass('markdown-active markdown-textarea');
        this.textarea.removeAttr('data-markdown-enabled');
        this.textarea.removeAttr('data-wants-redactor');

        if (newFormat === 'markdown') {
            this.textarea.addClass('markdown-active markdown-textarea');
            this.textarea.attr('data-markdown-enabled', 'true');
        }

        if (newFormat === 'html') {
            debugLog('Switching to HTML format', 'DEBUG');

            this.textarea.closest('td').find('.markdown-preview-container').remove();
            this.previewPane = null;
            debugLog('Removed all preview containers', 'DEBUG');

            if (this.toolbar) {
                this.toolbar.remove();
                this.toolbar = null;
                debugLog('Removed Markdown toolbar', 'DEBUG');
            }

            this.restoreRedactor();
        } else if (newFormat === 'markdown') {
            debugLog('Switching to Markdown format', 'DEBUG');

            if (oldFormat === 'html') {
                this.destroyRedactor();
            }

            if (!this.container || this.container.length === 0) {
                this.createContainer();
                debugLog('Created markdown container', 'DEBUG');
            } else {
                this.container.show();
                this.container.append(this.textarea);
                debugLog('Restored textarea to markdown container', 'DEBUG');
            }

            if (this.options.showToolbar && !this.toolbar) {
                this.createToolbar();
                debugLog('Created Markdown toolbar', 'DEBUG');
            }

            if (!this.previewPane && !this.options.compact) {
                this.createPreview();
                this.setupLivePreview();
                debugLog('Created Markdown preview', 'DEBUG');
            }

            if (!this.options.compact) {
                this.setupImageUpload();
            }

            if (this.toolbar) {
                this.toolbar.find('.markdown-toolbar-btn').show();
                this.toolbar.show();
            }

            if (this.previewPane && this.textarea.val().trim()) {
                this.renderPreview();
            }
        }

        this.textarea.trigger('formatChanged', [oldFormat, newFormat]);
        debugLog(`Format switch complete: ${oldFormat} → ${newFormat}`, 'DEBUG');
    }

    // -- Cleanup --

    destroy() {
        if (this.redactorObserver) {
            this.redactorObserver.disconnect();
            this.redactorObserver = null;
        }
        if (this.toolbar) this.toolbar.remove();
        if (this.previewPane) this.previewPane.parent().remove();
        this.textarea.unwrap();
        this.textarea.unwrap();
        this.textarea.removeClass('markdown-textarea markdown-active');
        this.textarea.off('input keydown paste.markdownImageUpload');
        if (this.container) {
            this.container.off('dragover.markdownImageUpload dragleave.markdownImageUpload drop.markdownImageUpload');
        }
        debugLog('Editor destroyed', 'DEBUG');
    }
}
