/**
 * Bootstrap: jQuery plugin registration, auto-init, and MutationObserver
 */

import { $ } from './globals.js';
import { debugLog } from './utils.js';
import { MarkdownEditor } from './core.js';

/**
 * Register jQuery plugin $.fn.markdownEditor
 */
export function registerPlugin() {
    $.fn.markdownEditor = function(options) {
        return this.each(function() {
            const $this = $(this);
            if ($this.data('markdownEditor')) {
                return;
            }
            const editor = new MarkdownEditor(this, options);
            $this.data('markdownEditor', editor);
        });
    };
}

/**
 * Prevent Redactor from re-initializing on Markdown textareas
 */
function preventRedactorReInitialization() {
    $(document).on('ajaxStop.markdownProtection', function() {
        $('textarea[data-markdown-enabled="true"], textarea.markdown-active').each(function() {
            const $textarea = $(this);
            if ($textarea.attr('data-wants-redactor') === 'true') {
                debugLog('Skipping protection - textarea wants Redactor:', 'DEBUG', $textarea.attr('name'));
                return;
            }
            $textarea.removeClass('richtext');
            $textarea.removeData('redactor');
            $textarea.removeData('redactor-instance');
            debugLog('Protected textarea from Redactor re-init:', 'DEBUG', $textarea.attr('name'));
        });
    });

    $(document).on('ajaxComplete.markdownProtection', function() {
        $('textarea[data-markdown-enabled="true"], textarea.markdown-active').each(function() {
            const $textarea = $(this);
            if ($textarea.attr('data-wants-redactor') === 'true') {
                return;
            }
            const $redactorBox = $textarea.siblings('.redactor-box');
            if ($redactorBox.length > 0) {
                debugLog('Redactor was re-initialized! Destroying immediately...', 'DEBUG');
                if (typeof $textarea.redactor === 'function') {
                    try {
                        $textarea.redactor('core.destroy');
                    } catch (e) {
                        // Silently ignore
                    }
                }
                $redactorBox.remove();
                $textarea.show();
                $textarea.removeClass('richtext');
                $textarea.removeData('redactor');
            }
        });
    });

    debugLog('Installed Redactor re-initialization protection', 'DEBUG');
}

/**
 * Auto-initialize editors on document ready
 */
export function autoInit() {
    $(document).ready(function() {
        debugLog('Initializing auto-detection...', 'DEBUG');

        preventRedactorReInitialization();

        const primarySelectors = [
            'textarea[name="response"]',
            'textarea[name="message"]',
            'textarea[name="note"]',
            'textarea.markdown-enabled',
            'textarea[data-markdown="true"]'
        ];

        const secondarySelectors = [
            'textarea.richtext'
        ];

        const selectors = [...primarySelectors, ...secondarySelectors];

        function isPrimaryTextarea($textarea) {
            const name = $textarea.attr('name') || '';
            return ['response', 'message', 'note'].includes(name) ||
                $textarea.hasClass('markdown-enabled') ||
                $textarea.attr('data-markdown') === 'true';
        }

        function initializeMarkdownEditors() {
            let attemptCount = 0;
            const maxAttempts = 10;
            const pollInterval = 200;

            function tryInitialize() {
                attemptCount++;

                selectors.forEach(selector => {
                    const $textareas = $(selector);
                    if ($textareas.length > 0) {
                        debugLog(`Found ${$textareas.length} textarea(s) matching ${selector}`, 'DEBUG');
                        $textareas.each(function() {
                            const $textarea = $(this);
                            if ($textarea.data('markdownEditor')) {
                                return;
                            }

                            const hasRedactor = $textarea.data('redactor') || $textarea.siblings('.redactor-box').length > 0;
                            if (hasRedactor || attemptCount >= maxAttempts) {
                                const compact = !isPrimaryTextarea($textarea);
                                debugLog(`Initializing editor for textarea: ${$textarea.attr('name')} (attempt ${attemptCount}, compact: ${compact})`, 'INFO');
                                $textarea.markdownEditor({
                                    previewPosition: 'bottom',
                                    debounceDelay: 500,
                                    compact: compact
                                });
                            }
                        });
                    }
                });

                if (attemptCount < maxAttempts) {
                    let hasUninitialized = false;
                    selectors.forEach(selector => {
                        $(selector).each(function() {
                            if (!$(this).data('markdownEditor')) {
                                hasUninitialized = true;
                            }
                        });
                    });

                    if (hasUninitialized) {
                        setTimeout(tryInitialize, pollInterval);
                    } else {
                        debugLog('All textareas initialized successfully', 'DEBUG');
                    }
                } else {
                    debugLog('Initialization complete (max attempts reached)', 'DEBUG');
                }
            }

            tryInitialize();
        }

        initializeMarkdownEditors();

        // MutationObserver for dynamically added textareas
        const observer = new MutationObserver(function(mutations) {
            let hasNewTextareas = false;

            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    const $node = $(node);
                    if ($node.is('textarea')) {
                        hasNewTextareas = true;
                    }
                    if ($node.find('textarea').length > 0) {
                        hasNewTextareas = true;
                    }
                });
            });

            if (hasNewTextareas) {
                debugLog('DOM mutation detected - checking for new textareas', 'DEBUG');
                setTimeout(function() {
                    selectors.forEach(selector => {
                        const $textareas = $(selector);
                        $textareas.each(function() {
                            const $textarea = $(this);
                            if ($textarea.data('markdownEditor')) {
                                return;
                            }

                            if ($textarea.is(':visible') || $textarea.parent().is(':visible')) {
                                const compact = !isPrimaryTextarea($textarea);
                                debugLog(`Initializing dynamically added textarea: ${$textarea.attr('name')} (compact: ${compact})`, 'INFO');
                                $textarea.markdownEditor({
                                    previewPosition: 'bottom',
                                    debounceDelay: 500,
                                    compact: compact
                                });
                            }
                        });
                    });
                }, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        debugLog('MutationObserver started for dynamic textareas', 'INFO');
    });
}
