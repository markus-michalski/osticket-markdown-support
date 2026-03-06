/**
 * Redactor WYSIWYG editor integration
 *
 * Handles destroying, restoring, and protecting against
 * osTicket's Redactor auto-initialization.
 */

import { $ } from './globals.js';
import { debugLog } from './utils.js';

/**
 * Destroy Redactor WYSIWYG editor if present
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function destroyRedactor(editor) {
    const $redactorBox = editor.textarea.siblings('.redactor-box');

    debugLog('destroyRedactor() called', 'DEBUG');
    debugLog('Found .redactor-box elements:', 'DEBUG', $redactorBox.length);
    debugLog('Textarea has .richtext class:', 'DEBUG', editor.textarea.hasClass('richtext'));
    debugLog('Redactor data:', 'DEBUG', editor.textarea.data('redactor'));

    // Try to destroy Redactor instance
    if (typeof editor.textarea.redactor === 'function') {
        try {
            editor.textarea.redactor('core.destroy');
            debugLog('Destroyed Redactor instance', 'DEBUG');
        } catch (e) {
            if (e.message && !e.message.includes('not found') && !e.message.includes('not initialized')) {
                debugLog('WARNING: [MarkdownEditor] Redactor destroy failed: ' + e.message, 'WARNING');
            }
            debugLog('Redactor destroy skipped (not initialized)', 'DEBUG');
        }
    }

    // Remove Redactor DOM container
    if ($redactorBox.length > 0) {
        $redactorBox.remove();
        debugLog('Removed Redactor box from DOM (sibling)', 'DEBUG');
    } else {
        const $parentRedactorBox = editor.textarea.closest('.redactor-box');
        if ($parentRedactorBox.length > 0) {
            debugLog('Found .redactor-box as PARENT! Moving textarea out and removing box...', 'DEBUG');
            editor.textarea.insertBefore($parentRedactorBox);
            $parentRedactorBox.remove();
            debugLog('Moved textarea out of .redactor-box and removed box', 'DEBUG');
        } else {
            debugLog('No .redactor-box found (Redactor was not initialized)', 'DEBUG');
        }
    }

    // Clean up data attributes
    editor.textarea.removeData('redactor');
    editor.textarea.removeData('redactor-instance');

    // Ensure textarea is visible
    editor.textarea.show().css({
        'display': 'block !important',
        'visibility': 'visible !important'
    });

    editor.textarea.removeClass('redactor-source redactor-in');
    debugLog('Removed Redactor classes and forced textarea visible', 'DEBUG');

    // Remove .richtext class (prevents osTicket re-init)
    editor.textarea.removeClass('richtext');

    // Set protection flags
    editor.textarea.attr('data-markdown-enabled', 'true');
    editor.textarea.addClass('markdown-active');

    // Setup MutationObserver as fallback defense
    setupRedactorProtection(editor);

    // Delayed check for async Redactor initialization
    setTimeout(() => {
        const $laterRedactorBox = editor.textarea.siblings('.redactor-box');
        if ($laterRedactorBox.length > 0) {
            debugLog('Found .redactor-box as sibling after delay! Removing...', 'DEBUG');
            $laterRedactorBox.remove();
            editor.textarea.show().css({
                'display': 'block !important',
                'visibility': 'visible !important'
            });
            editor.textarea.removeClass('richtext redactor-source redactor-in');
            debugLog('Removed delayed Redactor box (sibling)', 'DEBUG');
        }

        const $parentRedactorBox = editor.textarea.closest('.redactor-box');
        if ($parentRedactorBox.length > 0) {
            debugLog('Found .redactor-box as PARENT after delay! Unwrapping...', 'DEBUG');
            editor.textarea.unwrap('.redactor-box');
            editor.textarea.show().css({
                'display': 'block !important',
                'visibility': 'visible !important'
            });
            editor.textarea.removeClass('richtext redactor-source redactor-in');
            debugLog('Unwrapped delayed Redactor box (parent)', 'DEBUG');
        }
    }, 300);

    debugLog('Redactor cleanup complete', 'DEBUG');
}

/**
 * Restore Redactor WYSIWYG editor for HTML format
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function restoreRedactor(editor) {
    debugLog('Restoring Redactor for HTML format', 'INFO');

    // Disconnect MutationObserver first
    if (editor.redactorObserver) {
        editor.redactorObserver.disconnect();
        editor.redactorObserver = null;
        debugLog('Disconnected MutationObserver (allows Redactor creation)', 'DEBUG');
    }

    // Clean up existing Redactor data/config
    editor.textarea.removeData('redactor');
    editor.textarea.removeData('redactor-instance');
    editor.textarea.removeAttr('data-redactor');
    editor.textarea.removeAttr('data-redactor-uuid');
    debugLog('Cleared all Redactor data and attributes', 'DEBUG');

    // Remove existing Redactor DOM elements
    const existingRedactorBox = editor.textarea.siblings('.redactor-box');
    const existingRedactorIn = editor.textarea.siblings('[class*="redactor-in"]');
    const existingRedactorStyles = editor.textarea.siblings('.redactor-styles');

    if (existingRedactorBox.length > 0) {
        debugLog('Found existing .redactor-box, removing...', 'DEBUG');
        existingRedactorBox.remove();
    }
    if (existingRedactorIn.length > 0) {
        debugLog('Found existing redactor-in DIVs, removing...', 'DEBUG');
        existingRedactorIn.remove();
    }
    if (existingRedactorStyles.length > 0) {
        debugLog('Found existing .redactor-styles DIVs, removing...', 'DEBUG');
        existingRedactorStyles.remove();
    }

    // Move textarea out of our container
    if (editor.container && editor.container.length > 0) {
        if (editor.formatSwitcher && editor.formatSwitcher.length > 0) {
            editor.textarea.insertAfter(editor.formatSwitcher);
        } else {
            editor.textarea.insertBefore(editor.container);
        }
        editor.container.hide();
        debugLog('Moved textarea out of markdown container', 'DEBUG');
    }

    // Remove markdown classes and attributes
    editor.textarea.removeClass('markdown-textarea markdown-active');
    editor.textarea.removeAttr('data-markdown-enabled');

    // Mark textarea as "wants Redactor"
    editor.textarea.attr('data-wants-redactor', 'true');

    // Re-add .richtext class
    editor.textarea.addClass('richtext');

    // Remove -redactor-container class
    editor.textarea.parent().removeClass('-redactor-container');
    debugLog('Removed -redactor-container class from parent', 'DEBUG');

    // Remove markdown-specific inline styles
    editor.textarea.removeAttr('style');
    editor.textarea.show();

    // Force browser reflow
    editor.textarea[0].offsetHeight;

    // Initialize Redactor using osTicket's redact() function
    if (typeof $.fn.redact === 'function') {
        try {
            const $textarea = editor.textarea;
            const textareaName = $textarea.attr('name');

            setTimeout(() => {
                debugLog('Redactor initialization for:', 'DEBUG', textareaName);

                const redactPromise = $.fn.redact($textarea[0]);
                debugLog('Redactor initialization started...', 'DEBUG');

                if (redactPromise && typeof redactPromise.then === 'function') {
                    redactPromise.then(() => {
                        debugLog('Redactor Promise resolved for:', 'DEBUG', textareaName);

                        setTimeout(() => {
                            const $redactorBox = $textarea.siblings('.redactor-box');
                            const $redactorLayer = $textarea.siblings('.redactor-layer');
                            const $parent = $textarea.parent();

                            debugLog('Redactor box found:', 'DEBUG', $redactorBox.length);
                            debugLog('Redactor box visible:', 'DEBUG', $redactorBox.is(':visible'));
                            debugLog('Redactor layer found:', 'DEBUG', $redactorLayer.length);
                            debugLog('Textarea parent:', 'DEBUG', $parent[0]?.tagName, $parent.attr('class'));
                            debugLog('Textarea classes:', 'DEBUG', $textarea.attr('class'));
                            debugLog('Textarea visible:', 'DEBUG', $textarea.is(':visible'));
                            debugLog('Textarea data-redactor:', 'DEBUG', $textarea.data('redactor'));

                            if ($redactorBox.length === 0) {
                                debugLog('No .redactor-box found after Promise resolved!', 'WARNING');
                                debugLog('Attempting direct Redactor initialization...', 'DEBUG');

                                if (typeof $textarea.redactor === 'function') {
                                    $textarea.redactor({
                                        focus: false,
                                        toolbar: true,
                                        buttons: ['format', 'bold', 'italic', 'lists', 'link', 'file']
                                    });
                                    debugLog('Direct Redactor call completed', 'DEBUG');
                                }
                            } else {
                                debugLog('Redactor toolbar successfully created!', 'DEBUG');
                            }
                        }, 300);
                    }).catch((error) => {
                        debugLog('Redactor Promise rejected:', 'ERROR', error);
                    });
                } else {
                    debugLog('WARNING: [MarkdownEditor] $.fn.redact() did not return a Promise - using direct initialization for:', textareaName);

                    if (typeof $textarea.redactor === 'function') {
                        debugLog('Attempting direct Redactor.redactor() call...', 'DEBUG');
                        debugLog('Textarea state before direct init', 'DEBUG', {
                            name: textareaName,
                            classes: $textarea.attr('class'),
                            hasRichtext: $textarea.hasClass('richtext'),
                            hasWantsRedactor: $textarea.attr('data-wants-redactor'),
                            hasMarkdownEnabled: $textarea.attr('data-markdown-enabled'),
                            parent: $textarea.parent()[0]?.tagName,
                            isVisible: $textarea.is(':visible'),
                            display: $textarea.css('display')
                        });

                        try {
                            const result = $textarea.redactor({
                                focus: false,
                                inline: false,
                                toolbar: true,
                                air: false,
                                buttons: ['format', 'bold', 'italic', 'lists', 'link', 'file', 'image']
                            });
                            debugLog('Direct Redactor call returned:', 'DEBUG', result);
                            debugLog('Redactor rootElement:', 'DEBUG', result.rootElement);
                            debugLog('Redactor opts.inline:', 'DEBUG', result.opts?.inline);
                            debugLog('Redactor opts.air:', 'DEBUG', result.opts?.air);
                            debugLog('Redactor opts.toolbar:', 'DEBUG', result.opts?.toolbar);
                            debugLog('Redactor editor.$editor:', 'DEBUG', result.editor?.$editor);
                            debugLog('Redactor editor.$editor HTML:', 'DEBUG', result.editor?.$editor[0]?.outerHTML);
                            debugLog('Redactor toolbar.$toolbar:', 'DEBUG', result.toolbar?.$toolbar);
                            debugLog('Redactor container.$container:', 'DEBUG', result.container?.$container);
                        } catch (error) {
                            debugLog('Direct Redactor call threw error:', 'ERROR', error);
                        }

                        debugLog('Direct Redactor initialization triggered', 'DEBUG');

                        setTimeout(() => {
                            const $redactorBox = $textarea.siblings('.redactor-box');
                            debugLog('Redactor box found (direct init):', 'DEBUG', $redactorBox.length);
                            debugLog('Checking all possible Redactor containers...', 'DEBUG');
                            debugLog('Parent .redactor-box:', 'DEBUG', $textarea.parent('.redactor-box').length);
                            debugLog('Next .redactor-box:', 'DEBUG', $textarea.next('.redactor-box').length);
                            debugLog('Textarea display:', 'DEBUG', $textarea.css('display'));
                            debugLog('Textarea parent HTML:', 'DEBUG', $textarea.parent()[0]?.outerHTML);

                            if ($redactorBox.length > 0) {
                                debugLog('Direct Redactor initialization successful!', 'DEBUG');
                            } else {
                                debugLog('Redactor box not in DOM - attempting manual insertion...', 'WARNING');

                                const redactorInstance = $textarea.data('redactor');
                                if (redactorInstance && redactorInstance.container && redactorInstance.container.$container) {
                                    const redactorContainer = redactorInstance.container.$container;
                                    debugLog('Found Redactor container in memory:', 'DEBUG', redactorContainer);

                                    const containerNode = redactorContainer.nodes ? redactorContainer.nodes[0] : redactorContainer[0];

                                    if (containerNode) {
                                        const $container = $(containerNode);
                                        debugLog('Wrapped container node in jQuery:', 'DEBUG', $container);

                                        $container.insertAfter($textarea);
                                        $textarea.hide();

                                        debugLog('Manually inserted Redactor box into DOM!', 'DEBUG');
                                    } else {
                                        debugLog('Could not extract DOM node from Redactor container', 'ERROR');
                                    }
                                } else {
                                    debugLog('Could not find Redactor instance or container', 'ERROR');
                                }
                            }
                        }, 500);
                    } else {
                        debugLog('jQuery.redactor() plugin not available!', 'ERROR');
                    }
                }
            }, 150);
        } catch (e) {
            debugLog('Failed to initialize Redactor:', 'ERROR', e);
        }
    } else {
        debugLog('WARNING: [MarkdownEditor] $.fn.redact not available - cannot restore Redactor');
    }
}

/**
 * Setup MutationObserver to prevent Redactor from re-initializing
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function setupRedactorProtection(editor) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && $(node).hasClass('redactor-box')) {
                    debugLog('Detected Redactor re-initialization! Cleaning up...', 'DEBUG');

                    $(node).remove();
                    editor.textarea.show();
                    editor.textarea.removeClass('richtext');
                    editor.textarea.attr('data-markdown-enabled', 'true');
                    editor.textarea.removeData('redactor');
                }
            });
        });
    });

    if (editor.textarea[0].parentNode) {
        observer.observe(editor.textarea[0].parentNode, {
            childList: true,
            subtree: false
        });
        editor.redactorObserver = observer;
    }
}
