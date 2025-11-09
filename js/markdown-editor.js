/**
 * Markdown Editor Integration for osTicket
 *
 * Vollständiger Markdown-Editor mit Toolbar, Live-Preview und Format-Switching
 * Kompatibel mit osTicket's Thread Entry Forms
 *
 * @version 1.0.0
 * @author Markdown-Support Plugin
 */

(function() {
    'use strict';

    /**
     * Wait for jQuery to be available before initializing
     * This ensures the script works even if jQuery loads asynchronously
     */
    function initWhenReady() {
        if (typeof jQuery === 'undefined') {
            // jQuery not yet loaded - wait and retry
            setTimeout(initWhenReady, 50);
            return;
        }

        // jQuery is now available - proceed with initialization
        initializeMarkdownEditor(jQuery);
    }

    /**
     * Main initialization function (runs when jQuery is available)
     */
    function initializeMarkdownEditor($) {

    /**
     * PRODUCTION MODE: Debug logging disabled
     * Set to true for development/debugging, false for production
     */
    const DEBUG = false;

    /**
     * Debug logging function (browser console only)
     *
     * IMPORTANT: Logging is DISABLED in production by default (DEBUG = false)
     * Only ERROR and WARNING messages are always shown for critical issues
     *
     * @param {string} message - Log message
     * @param {string} level - Log level (DEBUG, INFO, WARNING, ERROR)
     * @param {object} context - Additional context data
     */
    function debugLog(message, level = 'DEBUG', context = {}) {
        // CRITICAL: Skip all DEBUG and INFO logs in production mode
        if (!DEBUG && (level === 'DEBUG' || level === 'INFO')) {
            return;
        }

        // Always show ERROR and WARNING (even in production)
        if (typeof console === 'undefined') {
            return; // No console available
        }

        const prefix = `[Markdown Editor ${level}]`;

        // Use appropriate console method based on level
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
     * MarkdownEditor - Hauptklasse für den Markdown-Editor
     */
    class MarkdownEditor {
        constructor(textarea, options = {}) {
            this.textarea = $(textarea);

            // Get global config from PHP (if available)
            const globalConfig = window.osTicketMarkdownConfig || {};

            // DEBUG: Log config
            debugLog('Global config received', 'DEBUG', globalConfig);
            debugLog('Default format from config: ' + globalConfig.defaultFormat, 'DEBUG');

            this.options = $.extend({
                showToolbar: globalConfig.showToolbar !== undefined ? globalConfig.showToolbar : true,
                allowFormatSwitch: globalConfig.allowFormatSwitch !== undefined ? globalConfig.allowFormatSwitch : true,
                previewPosition: 'bottom', // 'side' oder 'bottom'
                debounceDelay: 500,
                toolbarButtons: [
                    'bold', 'italic', 'heading', 'link', 'code',
                    'codeblock', 'ul', 'ol', 'quote', 'hr'
                ],
                shortcuts: true,
                autoInit: true
            }, options);

            this.container = null;
            this.toolbar = null;
            this.previewPane = null;
            this.debounceTimer = null;

            // CRITICAL: Use configured default format instead of hardcoded 'markdown'
            this.currentFormat = globalConfig.defaultFormat || 'markdown';

            debugLog('Current format set to: ' + this.currentFormat, 'INFO');
            debugLog('Editor options', 'DEBUG', this.options);

            if (this.options.autoInit) {
                this.init();
            }
        }

        /**
         * Initialisiert den Editor
         */
        init() {
            debugLog('Initializing editor for textarea: ' + this.textarea.attr('id'), 'INFO');
            debugLog('Current format: ' + this.currentFormat, 'DEBUG');

            // CRITICAL: Only destroy Redactor if NOT using HTML format
            // HTML format needs Redactor's WYSIWYG toolbar!
            if (this.currentFormat !== 'html') {
                debugLog('Destroying Redactor (not HTML format)', 'DEBUG');
                this.destroyRedactor();
            } else {
                debugLog('Keeping Redactor (HTML format)', 'DEBUG');
            }

            // Format-Switcher ZUERST erstellen (BEVOR Container!)
            // Muss AUSSERHALB des Containers sein, damit er bei allen Formaten sichtbar bleibt
            if (this.options.allowFormatSwitch) {
                this.createFormatSwitcherStandalone();
            }

            // Wrapper-Container erstellen (nur für Markdown/Text, nicht für HTML)
            if (this.currentFormat !== 'html') {
                this.createContainer();
            }

            // Toolbar erstellen (falls aktiviert und NICHT HTML)
            // Bei HTML nutzen wir Redactor's Toolbar
            if (this.options.showToolbar && this.currentFormat !== 'html') {
                this.createToolbar();
            }

            // Preview-Pane erstellen (nur für Markdown)
            // Bei HTML brauchen wir keine Preview
            if (this.currentFormat === 'markdown') {
                this.createPreview();
                this.setupLivePreview();
            }

            // Keyboard-Shortcuts registrieren (nur für Markdown)
            if (this.options.shortcuts && this.currentFormat === 'markdown') {
                this.setupKeyboardShortcuts();
            }

            // Initiales Rendering (nur für Markdown)
            if (this.currentFormat === 'markdown' && this.textarea.val().trim()) {
                this.renderPreview();
            }

            debugLog('Editor initialized successfully', 'DEBUG');
        }

        /**
         * Restores Redactor WYSIWYG editor for HTML format
         */
        restoreRedactor() {
            debugLog('Restoring Redactor for HTML format', 'INFO');

            // CRITICAL: Disconnect MutationObserver first!
            // Otherwise it will DESTROY the Redactor we're trying to create
            if (this.redactorObserver) {
                this.redactorObserver.disconnect();
                this.redactorObserver = null;
                debugLog('Disconnected MutationObserver (allows Redactor creation)', 'DEBUG');
            }

            // CRITICAL: Clean up ANY existing Redactor data/config first
            // This ensures a fresh initialization even if switching back from markdown
            // Also removes osTicket's stored config that might force inline mode
            this.textarea.removeData('redactor');
            this.textarea.removeData('redactor-instance');
            this.textarea.removeAttr('data-redactor');
            this.textarea.removeAttr('data-redactor-uuid');
            debugLog('Cleared all Redactor data and attributes', 'DEBUG');

            // CRITICAL: Remove ANY existing Redactor DOM elements
            // This includes inline editor DIVs, not just .redactor-box
            const existingRedactorBox = this.textarea.siblings('.redactor-box');
            const existingRedactorIn = this.textarea.siblings('[class*="redactor-in"]');
            const existingRedactorStyles = this.textarea.siblings('.redactor-styles');

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

            // CRITICAL: Move textarea OUT of our container if it exists
            // Redactor expects a "clean" textarea structure
            if (this.container && this.container.length > 0) {
                // Insert textarea before format switcher (if exists) or container
                if (this.formatSwitcher && this.formatSwitcher.length > 0) {
                    this.textarea.insertAfter(this.formatSwitcher);
                } else {
                    this.textarea.insertBefore(this.container);
                }
                this.container.hide();
                debugLog('Moved textarea out of markdown container', 'DEBUG');
            }

            // Remove markdown classes and attributes
            this.textarea.removeClass('markdown-textarea markdown-active');
            this.textarea.removeAttr('data-markdown-enabled');

            // CRITICAL: Mark textarea as "wants Redactor" to prevent our protection from blocking it
            this.textarea.attr('data-wants-redactor', 'true');

            // Re-add .richtext class (osTicket's trigger for Redactor)
            this.textarea.addClass('richtext');

            // CRITICAL: Remove osTicket's -redactor-container class that blocks WYSIWYG mode!
            // This class forces Redactor to run in source-only mode without toolbar
            this.textarea.parent().removeClass('-redactor-container');
            debugLog('Removed -redactor-container class from parent', 'DEBUG');

            // Remove any markdown-specific inline styles first
            this.textarea.removeAttr('style');

            // Make sure textarea is visible (osTicket default styles will apply)
            this.textarea.show();

            // Force browser reflow before Redactor init
            this.textarea[0].offsetHeight;

            // Initialize Redactor using osTicket's redact() function
            // CRITICAL: $.fn.redact() returns a PROMISE - we must wait for it!
            // osTicket's redact() is a wrapper that handles async config loading
            if (typeof $.fn.redact === 'function') {
                try {
                    // CRITICAL: Save reference to textarea before setTimeout to preserve scope
                    const $textarea = this.textarea;
                    const textareaName = $textarea.attr('name');

                    // Use setTimeout to ensure DOM is ready
                    setTimeout(() => {
                        debugLog('Redactor initialization for:', 'DEBUG', textareaName);

                        // IMPORTANT: Pass the DOM element and handle the Promise
                        // $.fn.redact() loads config async, then initializes Redactor
                        const redactPromise = $.fn.redact($textarea[0]);

                        debugLog('Redactor initialization started...', 'DEBUG');

                        // CRITICAL: Wait for the Promise to resolve
                        if (redactPromise && typeof redactPromise.then === 'function') {
                            redactPromise.then(() => {
                                debugLog('✅ Redactor Promise resolved for:', 'DEBUG', textareaName);

                                // Give Redactor time to create the DOM
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
                                        debugLog('⚠️ No .redactor-box found after Promise resolved!', 'WARNING');
                                        debugLog('Attempting direct Redactor initialization...', 'DEBUG');

                                        // FALLBACK: Try direct Redactor initialization
                                        if (typeof $textarea.redactor === 'function') {
                                            $textarea.redactor({
                                                focus: false,
                                                toolbar: true,
                                                buttons: ['format', 'bold', 'italic', 'lists', 'link', 'file']
                                            });
                                            debugLog('Direct Redactor call completed', 'DEBUG');
                                        }
                                    } else {
                                        debugLog('✅ Redactor toolbar successfully created!', 'DEBUG');
                                    }
                                }, 300);
                            }).catch((error) => {
                                debugLog('Redactor Promise rejected:', 'ERROR', error);
                            });
                        } else {
                            // CRITICAL: osTicket's wrapper didn't return Promise - use direct initialization
                            debugLog('WARNING: [MarkdownEditor] $.fn.redact() did not return a Promise - using direct initialization for:', textareaName);

                            // Try direct Redactor initialization (bypassing osTicket wrapper)
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

                                // Call Redactor directly (jQuery plugin)
                                try {
                                    const result = $textarea.redactor({
                                        focus: false,
                                        inline: false,  // CRITICAL: Force non-inline mode
                                        toolbar: true,
                                        air: false,     // Disable air mode (floating toolbar)
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

                                // Check result after a delay
                                setTimeout(() => {
                                    const $redactorBox = $textarea.siblings('.redactor-box');
                                    debugLog('Redactor box found (direct init):', 'DEBUG', $redactorBox.length);
                                    debugLog('Checking all possible Redactor containers...', 'DEBUG');
                                    debugLog('Parent .redactor-box:', 'DEBUG', $textarea.parent('.redactor-box').length);
                                    debugLog('Next .redactor-box:', 'DEBUG', $textarea.next('.redactor-box').length);
                                    debugLog('Textarea display:', 'DEBUG', $textarea.css('display'));
                                    debugLog('Textarea parent HTML:', 'DEBUG', $textarea.parent()[0]?.outerHTML);

                                    if ($redactorBox.length > 0) {
                                        debugLog('✅ Direct Redactor initialization successful!', 'DEBUG');
                                    } else {
                                        debugLog('❌ Redactor box not in DOM - attempting manual insertion...', 'WARNING');

                                        // CRITICAL: Redactor created the box but didn't insert it into DOM!
                                        // Get the container from Redactor instance
                                        const redactorInstance = $textarea.data('redactor');
                                        if (redactorInstance && redactorInstance.container && redactorInstance.container.$container) {
                                            const redactorContainer = redactorInstance.container.$container;
                                            debugLog('Found Redactor container in memory:', 'DEBUG', redactorContainer);

                                            // Redactor uses its own DOM wrapper - extract the actual DOM node
                                            const containerNode = redactorContainer.nodes ? redactorContainer.nodes[0] : redactorContainer[0];

                                            if (containerNode) {
                                                const $container = $(containerNode);
                                                debugLog('Wrapped container node in jQuery:', 'DEBUG', $container);

                                                // Insert container after textarea
                                                $container.insertAfter($textarea);

                                                // Hide the original textarea
                                                $textarea.hide();

                                                debugLog('✅ Manually inserted Redactor box into DOM!', 'DEBUG');
                                            } else {
                                                debugLog('❌ Could not extract DOM node from Redactor container', 'ERROR');
                                            }
                                        } else {
                                            debugLog('❌ Could not find Redactor instance or container', 'ERROR');
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
         * Destroys Redactor WYSIWYG editor if present
         * osTicket auto-initializes Redactor on textareas, which hides them
         *
         * Clean Strategy:
         * 1. Destroy Redactor instance (if exists)
         * 2. Remove Redactor DOM container (.redactor-box)
         * 3. Remove .richtext class (prevents osTicket re-initialization)
         * 4. Clean up data attributes
         * 5. Setup MutationObserver as fallback
         */
        destroyRedactor() {
            const $redactorBox = this.textarea.siblings('.redactor-box');

            // DEBUG: Log current state
            debugLog('destroyRedactor() called', 'DEBUG');
            debugLog('Found .redactor-box elements:', 'DEBUG', $redactorBox.length);
            debugLog('Textarea has .richtext class:', 'DEBUG', this.textarea.hasClass('richtext'));
            debugLog('Redactor data:', 'DEBUG', this.textarea.data('redactor'));

            // STEP 1: Try to destroy Redactor instance
            if (typeof this.textarea.redactor === 'function') {
                try {
                    this.textarea.redactor('core.destroy');
                    debugLog('Destroyed Redactor instance', 'DEBUG');
                } catch (e) {
                    // Only warn if it's a real error (not "service not found" or "not initialized")
                    if (e.message && !e.message.includes('not found') && !e.message.includes('not initialized')) {
                        debugLog('WARNING: [MarkdownEditor] Redactor destroy failed: ' + e.message, 'WARNING');
                    }
                    // Silently ignore "service not found" errors (Redactor was never initialized)
                    debugLog('Redactor destroy skipped (not initialized)', 'DEBUG');
                }
            }

            // STEP 2: Remove Redactor DOM container (clean removal)
            if ($redactorBox.length > 0) {
                $redactorBox.remove();
                debugLog('✅ Removed Redactor box from DOM (sibling)', 'DEBUG');
            } else {
                // Try to find .redactor-box in parent tree
                const $parentRedactorBox = this.textarea.closest('.redactor-box');
                if ($parentRedactorBox.length > 0) {
                    debugLog('Found .redactor-box as PARENT! Moving textarea out and removing box...', 'DEBUG');
                    // Move textarea BEFORE the .redactor-box
                    this.textarea.insertBefore($parentRedactorBox);
                    // Remove the now-empty .redactor-box
                    $parentRedactorBox.remove();
                    debugLog('✅ Moved textarea out of .redactor-box and removed box', 'DEBUG');
                } else {
                    debugLog('No .redactor-box found (Redactor was not initialized)', 'DEBUG');
                }
            }

            // STEP 3: Clean up Redactor data attributes
            this.textarea.removeData('redactor');
            this.textarea.removeData('redactor-instance');

            // STEP 4: Ensure textarea is visible (Redactor hides it)
            this.textarea.show().css({
                'display': 'block !important',
                'visibility': 'visible !important'
            });

            // Remove Redactor-specific classes
            this.textarea.removeClass('redactor-source redactor-in');
            debugLog('Removed Redactor classes and forced textarea visible', 'DEBUG');

            // STEP 5: CRITICAL - Remove .richtext class (prevents osTicket re-init)
            // This is the KEY to preventing re-initialization!
            this.textarea.removeClass('richtext');

            // STEP 6: Set protection flags for defensive programming
            this.textarea.attr('data-markdown-enabled', 'true');
            this.textarea.addClass('markdown-active');

            // STEP 7: Setup MutationObserver as fallback defense
            this.setupRedactorProtection();

            // STEP 8: CRITICAL FIX - Delayed check for async Redactor initialization
            // Redactor may initialize AFTER our destroyRedactor() runs
            const self = this;
            setTimeout(() => {
                // Check for sibling .redactor-box
                const $laterRedactorBox = self.textarea.siblings('.redactor-box');
                if ($laterRedactorBox.length > 0) {
                    debugLog('Found .redactor-box as sibling after delay! Removing...', 'DEBUG');
                    $laterRedactorBox.remove();
                    self.textarea.show().css({
                        'display': 'block !important',
                        'visibility': 'visible !important'
                    });
                    self.textarea.removeClass('richtext redactor-source redactor-in');
                    debugLog('✅ Removed delayed Redactor box (sibling)', 'DEBUG');
                }

                // Check for parent .redactor-box
                const $parentRedactorBox = self.textarea.closest('.redactor-box');
                if ($parentRedactorBox.length > 0) {
                    debugLog('Found .redactor-box as PARENT after delay! Unwrapping...', 'DEBUG');
                    self.textarea.unwrap('.redactor-box');
                    self.textarea.show().css({
                        'display': 'block !important',
                        'visibility': 'visible !important'
                    });
                    self.textarea.removeClass('richtext redactor-source redactor-in');
                    debugLog('✅ Unwrapped delayed Redactor box (parent)', 'DEBUG');
                }
            }, 300); // Check again after 300ms

            debugLog('Redactor cleanup complete', 'DEBUG');
        }

        /**
         * Sets up a MutationObserver to prevent Redactor from re-initializing
         * This is a fallback defense layer in case osTicket tries to re-init Redactor
         *
         * Clean Strategy:
         * - Observe DOM for new .redactor-box elements
         * - Remove them immediately with clean .remove()
         * - Re-apply protection flags
         * - No CSS hacks, no periodic polling
         */
        setupRedactorProtection() {
            const self = this;

            // Observer for DOM changes (detects Redactor re-initialization)
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    // Check if a .redactor-box was added (Redactor re-initialized)
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && $(node).hasClass('redactor-box')) {
                            debugLog('Detected Redactor re-initialization! Cleaning up...', 'DEBUG');

                            // Clean removal (no CSS hacks!)
                            $(node).remove();

                            // Ensure textarea is visible
                            self.textarea.show();

                            // Re-apply protection flags
                            self.textarea.removeClass('richtext');
                            self.textarea.attr('data-markdown-enabled', 'true');
                            self.textarea.removeData('redactor');
                        }
                    });
                });
            });

            // Observe the textarea's parent for child additions
            if (this.textarea[0].parentNode) {
                observer.observe(this.textarea[0].parentNode, {
                    childList: true,
                    subtree: false
                });

                // Store observer reference for cleanup
                this.redactorObserver = observer;
            }
        }

        /**
         * Erstellt den Container-Wrapper um die Textarea
         */
        createContainer() {
            this.container = $('<div>', {
                class: 'markdown-editor-container',
                'data-format': this.currentFormat
            });

            // Textarea wrappen
            this.textarea.wrap(this.container);
            this.container = this.textarea.parent();

            // Editor-Wrapper für Textarea
            const editorWrapper = $('<div>', {
                class: 'markdown-editor-wrapper'
            });

            this.textarea.wrap(editorWrapper);
            this.textarea.addClass('markdown-textarea');

            // Add or update format field to tell osTicket this is markdown
            this.ensureFormatField();
        }

        /**
         * Ensures a hidden format field exists and is set to current format
         * This tells osTicket to save the thread entry with the selected format
         */
        ensureFormatField() {
            const textareaName = this.textarea.attr('name');

            // Check if a format field already exists for this textarea
            // osTicket uses naming like: format_{textarea_name} or just format
            let formatField = this.textarea.closest('form').find('input[name="format"]');

            // If not found, try format with textarea name
            if (formatField.length === 0) {
                formatField = this.textarea.closest('form').find(`input[name="format[${textareaName}]"]`);
            }

            // If still not found, create it
            if (formatField.length === 0) {
                formatField = $('<input>', {
                    type: 'hidden',
                    name: 'format',
                    value: this.currentFormat
                });

                // Insert after textarea
                this.textarea.after(formatField);
                debugLog(`Created format field with value "${this.currentFormat}"`, 'DEBUG');
            } else {
                // Update existing field to current format
                formatField.val(this.currentFormat);
                debugLog(`Updated existing format field to "${this.currentFormat}"`, 'DEBUG');
            }

            // Store reference for later updates
            this.formatField = formatField;
        }

        /**
         * Erstellt die Toolbar mit allen Buttons
         */
        createToolbar() {
            this.toolbar = $('<div>', {
                class: 'markdown-toolbar',
                role: 'toolbar',
                'aria-label': 'Markdown Formatting Tools'
            });

            // Toolbar-Buttons erstellen
            this.options.toolbarButtons.forEach(button => {
                const btn = this.createToolbarButton(button);
                if (btn) {
                    this.toolbar.append(btn);
                }
            });

            // Note: Format-Switcher is now standalone (created in init())
            // and not part of the toolbar anymore

            // Preview-Toggle Button (nur mobile)
            const previewToggle = this.createPreviewToggle();
            this.toolbar.append(previewToggle);

            // Toolbar vor der Textarea einfügen
            this.container.prepend(this.toolbar);
        }

        /**
         * Erstellt einen einzelnen Toolbar-Button
         */
        createToolbarButton(type) {
            const buttons = {
                bold: {
                    title: 'Bold (Ctrl+B)',
                    icon: this.getIcon('bold'),
                    action: () => this.wrapSelection('**', '**', 'bold text')
                },
                italic: {
                    title: 'Italic (Ctrl+I)',
                    icon: this.getIcon('italic'),
                    action: () => this.wrapSelection('*', '*', 'italic text')
                },
                heading: {
                    title: 'Heading (Ctrl+H)',
                    icon: this.getIcon('heading'),
                    action: () => this.insertHeading()
                },
                link: {
                    title: 'Link (Ctrl+K)',
                    icon: this.getIcon('link'),
                    action: () => this.insertLink()
                },
                code: {
                    title: 'Inline Code',
                    icon: this.getIcon('code'),
                    action: () => this.wrapSelection('`', '`', 'code')
                },
                codeblock: {
                    title: 'Code Block',
                    icon: this.getIcon('codeblock'),
                    action: () => this.insertCodeBlock()
                },
                ul: {
                    title: 'Unordered List',
                    icon: this.getIcon('list-ul'),
                    action: () => this.insertList('ul')
                },
                ol: {
                    title: 'Ordered List',
                    icon: this.getIcon('list-ol'),
                    action: () => this.insertList('ol')
                },
                quote: {
                    title: 'Blockquote',
                    icon: this.getIcon('quote'),
                    action: () => this.insertBlockquote()
                },
                hr: {
                    title: 'Horizontal Rule',
                    icon: this.getIcon('hr'),
                    action: () => this.insertHorizontalRule()
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
                    this.textarea.focus();
                }
            });
        }

        /**
         * Erstellt den Format-Switcher als standalone Element
         * Wird UNABHÄNGIG von der Toolbar platziert, damit er auch bei HTML-Format verfügbar ist
         */
        createFormatSwitcherStandalone() {
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
                change: (e) => this.switchFormat(e.target.value)
            });

            const formats = [
                { value: 'markdown', label: 'Markdown' },
                { value: 'html', label: 'HTML' }
            ];

            formats.forEach(format => {
                $select.append($('<option>', {
                    value: format.value,
                    text: format.label,
                    selected: format.value === this.currentFormat
                }));
            });

            $wrapper.append($label).append($select);

            // Insert BEFORE the textarea (works for all formats)
            // This ensures it's always visible and above the editor
            this.textarea.before($wrapper);

            // Store reference for later updates
            this.formatSwitcher = $wrapper;
            this.formatSwitcherSelect = $select;

            debugLog('Created standalone format switcher before textarea', 'DEBUG');
        }

        /**
         * Erstellt den Format-Switcher Dropdown (for toolbar integration - LEGACY)
         */
        createFormatSwitcher() {
            const switcher = $('<div>', {
                class: 'format-switcher'
            });

            const select = $('<select>', {
                class: 'format-switcher-select',
                'aria-label': 'Select input format',
                change: (e) => this.switchFormat(e.target.value)
            });

            const formats = [
                { value: 'markdown', label: 'Markdown' },
                { value: 'html', label: 'HTML' }
            ];

            formats.forEach(format => {
                select.append($('<option>', {
                    value: format.value,
                    text: format.label,
                    selected: format.value === this.currentFormat
                }));
            });

            switcher.append(select);
            return switcher;
        }

        /**
         * Erstellt den Preview-Toggle Button (mobile)
         */
        createPreviewToggle() {
            return $('<button>', {
                type: 'button',
                class: 'markdown-preview-toggle',
                'data-action': 'toggle-preview',
                title: 'Toggle Preview',
                'aria-label': 'Toggle Preview',
                html: this.getIcon('eye'),
                click: (e) => {
                    e.preventDefault();
                    this.togglePreview();
                }
            });
        }

        /**
         * Erstellt die Preview-Pane
         */
        createPreview() {
            // CRITICAL: Remove ALL existing preview containers first
            // This prevents duplicate previews from accumulating
            this.textarea.closest('td').find('.markdown-preview-container').remove();
            debugLog('Removed all existing preview containers', 'DEBUG');

            const previewContainer = $('<div>', {
                class: 'markdown-preview-container'
            });

            const previewHeader = $('<div>', {
                class: 'markdown-preview-header',
                html: '<span>Preview</span>'
            });

            this.previewPane = $('<div>', {
                class: 'markdown-preview',
                'aria-live': 'polite',
                'aria-label': 'Markdown Preview'
            });

            previewContainer.append(previewHeader, this.previewPane);

            // Position basierend auf Option
            if (this.options.previewPosition === 'side') {
                this.container.addClass('preview-side');

                // Create content-area wrapper for editor + preview
                const contentArea = $('<div>', {
                    class: 'markdown-content-area'
                });

                // Wrap editorWrapper in contentArea
                this.textarea.parent().wrap(contentArea);

                // Append preview to contentArea (now sibling of editorWrapper)
                this.textarea.parent().parent().append(previewContainer);
            } else {
                this.container.addClass('preview-bottom');
                this.textarea.parent().after(previewContainer);
            }

            debugLog('Created new preview container', 'DEBUG');
        }

        /**
         * Richtet Live-Preview mit Debouncing ein
         */
        setupLivePreview() {
            this.textarea.on('input', () => {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.renderPreview();
                }, this.options.debounceDelay);
            });
        }

        /**
         * Rendert die Markdown-Preview
         */
        renderPreview() {
            const markdown = this.textarea.val();

            if (!markdown.trim()) {
                this.previewPane.html('<p class="preview-empty">Preview wird hier angezeigt...</p>');
                return;
            }

            // Get preview API URL from config
            const config = window.osTicketMarkdownConfig || {};
            const previewApiUrl = config.previewApiUrl;

            // If backend API is available, use it for 100% accurate preview
            if (previewApiUrl) {
                debugLog('Rendering preview via backend API', 'DEBUG', { url: previewApiUrl });

                $.ajax({
                    url: previewApiUrl,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ markdown: markdown }),
                    dataType: 'json',
                    success: (response) => {
                        if (response.success && response.html) {
                            debugLog('Backend preview rendered successfully', 'DEBUG');
                            this.previewPane.html(response.html);
                        } else {
                            debugLog('Backend preview failed: Invalid response', 'ERROR', response);
                            this.fallbackToClientPreview(markdown);
                        }
                    },
                    error: (xhr, status, error) => {
                        debugLog('Backend preview failed: ' + error, 'ERROR', { status: status, xhr: xhr });
                        this.fallbackToClientPreview(markdown);
                    }
                });
            } else {
                // No backend API available - use client-side fallback
                debugLog('No backend API configured - using client-side preview', 'WARN');
                this.fallbackToClientPreview(markdown);
            }
        }

        /**
         * Fallback zu Client-Side Preview
         */
        fallbackToClientPreview(markdown) {
            debugLog('Using client-side preview fallback', 'DEBUG');
            const html = this.simpleMarkdownToHtml(markdown);
            this.previewPane.html(html);
        }

        /**
         * Einfacher Client-Side Markdown-to-HTML Converter
         * (Fallback wenn Backend nicht verfügbar)
         */
        simpleMarkdownToHtml(markdown) {
            let html = markdown;

            // Code blocks (FIRST, before inline code)
            html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

            // Headings
            html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
            html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
            html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

            // Bold (before italic to prevent conflicts)
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            // Italic
            html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

            // Links
            html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

            // Inline code
            html = html.replace(/`(.+?)`/g, '<code>$1</code>');

            // Unordered lists (convert lines starting with * to temporary markers)
            html = html.replace(/^\* (.+)$/gim, '___UL___<li>$1</li>');
            // Ordered lists (convert lines starting with numbers to temporary markers)
            html = html.replace(/^\d+\. (.+)$/gim, '___OL___<li>$1</li>');

            // Wrap consecutive UL items in <ul>
            html = html.replace(/(___UL___<li>.*<\/li>\n?)+/g, function(match) {
                return '<ul>' + match.replace(/___UL___/g, '') + '</ul>';
            });

            // Wrap consecutive OL items in <ol>
            html = html.replace(/(___OL___<li>.*<\/li>\n?)+/g, function(match) {
                return '<ol>' + match.replace(/___OL___/g, '') + '</ol>';
            });

            // Blockquotes
            html = html.replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');

            // Horizontal rules
            html = html.replace(/^---$/gim, '<hr>');

            // Line breaks (preserve paragraph structure)
            html = html.replace(/\n\n/g, '</p><p>');
            html = html.replace(/\n/g, '<br>');

            // Wrap in paragraph if not already in block element
            if (!html.match(/^<(h\d|ul|ol|pre|blockquote)/)) {
                html = '<p>' + html + '</p>';
            }

            return html;
        }

        /**
         * Toggle Preview (mobile)
         */
        togglePreview() {
            this.container.toggleClass('preview-hidden');
        }

        /**
         * Keyboard-Shortcuts Setup
         */
        setupKeyboardShortcuts() {
            this.textarea.on('keydown', (e) => {
                // Ctrl/Cmd gedrückt?
                const isMod = e.ctrlKey || e.metaKey;

                if (!isMod) return;

                switch(e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.wrapSelection('**', '**', 'bold text');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.wrapSelection('*', '*', 'italic text');
                        break;
                    case 'k':
                        e.preventDefault();
                        this.insertLink();
                        break;
                    case 'h':
                        e.preventDefault();
                        this.insertHeading();
                        break;
                }
            });
        }

        /**
         * Wraps selected text with prefix and suffix
         */
        wrapSelection(prefix, suffix, placeholder = '') {
            const textarea = this.textarea[0];
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const selection = text.substring(start, end);

            const wrapped = prefix + (selection || placeholder) + suffix;

            textarea.value = text.substring(0, start) + wrapped + text.substring(end);

            // Cursor positionieren
            const newCursorPos = start + prefix.length;
            textarea.setSelectionRange(
                newCursorPos,
                newCursorPos + (selection || placeholder).length
            );

            this.textarea.trigger('input');
        }

        /**
         * Fügt Heading ein (cycle durch H1-H6)
         */
        insertHeading() {
            const textarea = this.textarea[0];
            const start = textarea.selectionStart;
            const text = textarea.value;

            // Prüfe, ob wir am Zeilenanfang sind
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            const lineText = text.substring(lineStart, start);

            // Zähle vorhandene #
            const hashMatch = lineText.match(/^(#{1,6})\s*/);
            let hashCount = hashMatch ? hashMatch[1].length : 0;

            // Cycle durch H1-H6
            hashCount = (hashCount % 6) + 1;
            const hashes = '#'.repeat(hashCount) + ' ';

            if (hashMatch) {
                // Ersetze vorhandene Hashes
                const newText = text.substring(0, lineStart) +
                               text.substring(lineStart).replace(/^#{1,6}\s*/, hashes);
                textarea.value = newText;
                textarea.setSelectionRange(start, start);
            } else {
                // Füge Hashes am Zeilenanfang ein
                textarea.value = text.substring(0, lineStart) + hashes + text.substring(lineStart);
                textarea.setSelectionRange(start + hashes.length, start + hashes.length);
            }

            this.textarea.trigger('input');
        }

        /**
         * Fügt Link ein
         */
        insertLink() {
            const textarea = this.textarea[0];
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

                this.textarea.trigger('input');
            }
        }

        /**
         * Fügt Code-Block ein
         */
        insertCodeBlock() {
            const language = prompt('Programmiersprache (optional):', 'javascript') || '';
            this.wrapSelection(`\`\`\`${language}\n`, '\n\`\`\`', 'code here');
        }

        /**
         * Fügt Liste ein (ul oder ol)
         */
        insertList(type) {
            const textarea = this.textarea[0];
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

            this.textarea.trigger('input');
        }

        /**
         * Fügt Blockquote ein
         */
        insertBlockquote() {
            const textarea = this.textarea[0];
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const selection = text.substring(start, end);

            const lines = selection ? selection.split('\n') : ['Quote'];
            const quote = lines.map(line => `> ${line}`).join('\n');

            textarea.value = text.substring(0, start) + quote + text.substring(end);

            const newPos = start + quote.length;
            textarea.setSelectionRange(newPos, newPos);

            this.textarea.trigger('input');
        }

        /**
         * Fügt Horizontal Rule ein
         */
        insertHorizontalRule() {
            const textarea = this.textarea[0];
            const start = textarea.selectionStart;
            const text = textarea.value;

            const hr = '\n\n---\n\n';
            textarea.value = text.substring(0, start) + hr + text.substring(start);

            const newPos = start + hr.length;
            textarea.setSelectionRange(newPos, newPos);

            this.textarea.trigger('input');
        }

        /**
         * Wechselt das Format (Markdown, HTML, Text)
         */
        switchFormat(newFormat) {
            debugLog('Switching format from ' + this.currentFormat + ' to ' + newFormat, 'INFO');

            const oldFormat = this.currentFormat;
            this.currentFormat = newFormat;

            this.container.attr('data-format', newFormat);

            // Update hidden format field
            if (this.formatField) {
                this.formatField.val(newFormat);
                debugLog('Updated format field to: ' + newFormat, 'DEBUG');
            }

            // CRITICAL: Update textarea classes and attributes for format
            this.textarea.removeClass('markdown-active markdown-textarea');
            this.textarea.removeAttr('data-markdown-enabled');
            this.textarea.removeAttr('data-wants-redactor'); // Always remove first

            if (newFormat === 'markdown') {
                this.textarea.addClass('markdown-active markdown-textarea');
                this.textarea.attr('data-markdown-enabled', 'true');
            }

            // CRITICAL: Handle format-specific UI changes
            if (newFormat === 'html') {
                // ===== SWITCHING TO HTML =====
                debugLog('Switching to HTML format', 'DEBUG');

                // Remove ALL preview containers (not just reference)
                this.textarea.closest('td').find('.markdown-preview-container').remove();
                this.previewPane = null;
                debugLog('Removed all preview containers', 'DEBUG');

                // Remove Markdown toolbar if exists
                if (this.toolbar) {
                    this.toolbar.remove();
                    this.toolbar = null;
                    debugLog('Removed Markdown toolbar', 'DEBUG');
                }

                // Restore Redactor WYSIWYG
                this.restoreRedactor();

            } else if (newFormat === 'markdown') {
                // ===== SWITCHING TO MARKDOWN =====
                debugLog('Switching to Markdown format', 'DEBUG');

                // Destroy Redactor if coming from HTML
                if (oldFormat === 'html') {
                    this.destroyRedactor();
                }

                // CRITICAL: Create or restore container
                if (!this.container || this.container.length === 0) {
                    // Coming from HTML (no container) - create it
                    this.createContainer();
                    debugLog('Created markdown container', 'DEBUG');
                } else {
                    // Container exists - show it and move textarea back
                    this.container.show();
                    this.container.append(this.textarea);
                    debugLog('Restored textarea to markdown container', 'DEBUG');
                }

                // Create Markdown toolbar if enabled and not exists
                if (this.options.showToolbar && !this.toolbar) {
                    this.createToolbar();
                    debugLog('Created Markdown toolbar', 'DEBUG');
                }

                // Create preview if not exists
                if (!this.previewPane) {
                    this.createPreview();
                    this.setupLivePreview();
                    debugLog('Created Markdown preview', 'DEBUG');
                }

                // Show all Markdown-specific buttons
                if (this.toolbar) {
                    this.toolbar.find('.markdown-toolbar-btn').show();
                    this.toolbar.show();
                }

                // Trigger initial preview render if content exists
                if (this.previewPane && this.textarea.val().trim()) {
                    this.renderPreview();
                }
            }

            // Trigger Event für externe Handler
            this.textarea.trigger('formatChanged', [oldFormat, newFormat]);

            debugLog(`Format switch complete: ${oldFormat} → ${newFormat}`, 'DEBUG');
        }

        /**
         * Liefert SVG-Icon für Button
         */
        getIcon(type) {
            const icons = {
                bold: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>',
                italic: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>',
                heading: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 4v7h5.5v2.5h2V11H18V4h-2v5h-3.5V4h-2v5H7V4H5zm8 15c.83 0 1.5-.67 1.5-1.5h5v-2h-5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5H6v2h5.5c0 .83.67 1.5 1.5 1.5z"/></svg>',
                link: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
                code: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
                codeblock: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>',
                'list-ul': '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>',
                'list-ol': '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>',
                quote: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>',
                hr: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 13H5v-2h14v2z"/></svg>',
                eye: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
            };

            return icons[type] || '';
        }

        /**
         * Zerstört den Editor
         */
        destroy() {
            // Disconnect MutationObserver
            if (this.redactorObserver) {
                this.redactorObserver.disconnect();
                this.redactorObserver = null;
            }

            if (this.toolbar) this.toolbar.remove();
            if (this.previewPane) this.previewPane.parent().remove();

            this.textarea.unwrap(); // Remove editor-wrapper
            this.textarea.unwrap(); // Remove container
            this.textarea.removeClass('markdown-textarea markdown-active');

            this.textarea.off('input keydown');

            debugLog('Editor destroyed', 'DEBUG');
        }
    }

    /**
     * jQuery Plugin Wrapper
     */
    $.fn.markdownEditor = function(options) {
        return this.each(function() {
            const $this = $(this);

            // Verhindere doppelte Initialisierung
            if ($this.data('markdownEditor')) {
                return;
            }

            const editor = new MarkdownEditor(this, options);
            $this.data('markdownEditor', editor);
        });
    };

    /**
     * Prevents osTicket from re-initializing Redactor on Markdown-enabled textareas
     * Uses ajaxStop event to run BEFORE osTicket's findRichtextBoxes
     */
    function preventRedactorReInitialization() {
        // Hook into ajaxStop event (BEFORE osTicket's handler runs)
        // osTicket binds findRichtextBoxes to ajaxStop, we need to run first
        $(document).on('ajaxStop.markdownProtection', function() {
            // Remove .richtext class from markdown-enabled textareas
            // This prevents osTicket's selector from finding them
            $('textarea[data-markdown-enabled="true"], textarea.markdown-active').each(function() {
                const $textarea = $(this);

                // CRITICAL: Skip textareas that explicitly want Redactor (HTML format)
                if ($textarea.attr('data-wants-redactor') === 'true') {
                    debugLog('Skipping protection - textarea wants Redactor:', 'DEBUG', $textarea.attr('name'));
                    return; // Skip this textarea
                }

                // Ensure richtext class is removed
                $textarea.removeClass('richtext');

                // Ensure Redactor data is cleared
                $textarea.removeData('redactor');
                $textarea.removeData('redactor-instance');

                debugLog('Protected textarea from Redactor re-init:', 'DEBUG', $textarea.attr('name'));
            });
        });

        // Also hook into ajaxComplete for immediate protection
        $(document).on('ajaxComplete.markdownProtection', function() {
            // Quick check: if any markdown textarea got a redactor-box sibling, destroy it
            $('textarea[data-markdown-enabled="true"], textarea.markdown-active').each(function() {
                const $textarea = $(this);

                // CRITICAL: Skip textareas that explicitly want Redactor (HTML format)
                if ($textarea.attr('data-wants-redactor') === 'true') {
                    return; // Skip this textarea
                }

                const $redactorBox = $textarea.siblings('.redactor-box');

                if ($redactorBox.length > 0) {
                    debugLog('Redactor was re-initialized! Destroying immediately...', 'DEBUG');

                    // Destroy Redactor
                    if (typeof $textarea.redactor === 'function') {
                        try {
                            $textarea.redactor('core.destroy');
                        } catch (e) {
                            // Ignore errors
                        }
                    }

                    // Remove container
                    $redactorBox.remove();

                    // Show textarea
                    $textarea.show();

                    // Re-apply protection
                    $textarea.removeClass('richtext');
                    $textarea.removeData('redactor');
                }
            });
        });

        debugLog('Installed Redactor re-initialization protection', 'DEBUG');
    }

    /**
     * Auto-Initialisierung bei DOM-Ready
     */
    $(document).ready(function() {
        debugLog('Initializing auto-detection...', 'DEBUG');

        // Install protection against Redactor re-initialization
        preventRedactorReInitialization();

        // Suche nach osTicket Thread Entry Forms
        const selectors = [
            'textarea[name="response"]',           // Staff reply
            'textarea[name="message"]',            // New ticket message
            'textarea[name="note"]',               // Internal note
            'textarea.richtext',                   // osTicket custom form fields with WYSIWYG
            'textarea.markdown-enabled',           // Explizit markierte Textareas
            'textarea[data-markdown="true"]'       // Data-Attribute
        ];

        /**
         * Initialize Markdown Editor for textareas
         * Waits for Redactor initialization with polling instead of fixed timeout
         */
        function initializeMarkdownEditors() {
            let attemptCount = 0;
            const maxAttempts = 10;
            const pollInterval = 200; // Check every 200ms

            function tryInitialize() {
                attemptCount++;

                selectors.forEach(selector => {
                    const $textareas = $(selector);

                    if ($textareas.length > 0) {
                        debugLog(`Found ${$textareas.length} textarea(s) matching ${selector}`, 'DEBUG');

                        $textareas.each(function() {
                            const $textarea = $(this);

                            // Skip if already initialized
                            if ($textarea.data('markdownEditor')) {
                                return;
                            }

                            // Check if Redactor has initialized on this textarea
                            const hasRedactor = $textarea.data('redactor') ||
                                              $textarea.siblings('.redactor-box').length > 0;

                            // If Redactor is present OR we've waited long enough, initialize
                            if (hasRedactor || attemptCount >= maxAttempts) {
                                debugLog(`Initializing editor for textarea: ${$textarea.attr('name')} (attempt ${attemptCount})`, 'INFO');

                                $textarea.markdownEditor({
                                    previewPosition: 'bottom',
                                    debounceDelay: 500
                                });
                            }
                        });
                    }
                });

                // Continue polling if not all textareas are initialized and we haven't exceeded max attempts
                if (attemptCount < maxAttempts) {
                    // Check if there are still uninitialized textareas
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

            // Start polling
            tryInitialize();
        }

        // Start initialization process
        initializeMarkdownEditors();

        // MutationObserver for dynamically added textareas
        // This handles cases where textareas are added AFTER page load
        // (e.g., "Ticket Details" field after selecting Help Topic)
        const observer = new MutationObserver(function(mutations) {
            let hasNewTextareas = false;

            mutations.forEach(function(mutation) {
                // Check added nodes
                mutation.addedNodes.forEach(function(node) {
                    // Skip text nodes
                    if (node.nodeType !== Node.ELEMENT_NODE) return;

                    const $node = $(node);

                    // Check if the node itself is a textarea
                    if ($node.is('textarea')) {
                        hasNewTextareas = true;
                    }

                    // Check if the node contains textareas
                    if ($node.find('textarea').length > 0) {
                        hasNewTextareas = true;
                    }
                });
            });

            // If new textareas were added, try to initialize them
            if (hasNewTextareas) {
                debugLog('DOM mutation detected - checking for new textareas', 'DEBUG');

                // Delay to allow Redactor to initialize first
                setTimeout(function() {
                    selectors.forEach(selector => {
                        const $textareas = $(selector);

                        $textareas.each(function() {
                            const $textarea = $(this);

                            // Skip if already initialized
                            if ($textarea.data('markdownEditor')) {
                                return;
                            }

                            // Check if visible (might have been hidden before)
                            if ($textarea.is(':visible') || $textarea.parent().is(':visible')) {
                                debugLog(`Initializing dynamically added textarea: ${$textarea.attr('name')}`, 'INFO');

                                $textarea.markdownEditor({
                                    previewPosition: 'bottom',
                                    debounceDelay: 500
                                });
                            }
                        });
                    });
                }, 500); // Longer delay for dynamic content
            }
        });

        // Start observing the document for DOM changes
        observer.observe(document.body, {
            childList: true,  // Watch for added/removed nodes
            subtree: true     // Watch entire subtree
        });

        debugLog('MutationObserver started for dynamic textareas', 'INFO');
    });

    // Expose MarkdownEditor class globally
    window.MarkdownEditor = MarkdownEditor;

    } // end initializeMarkdownEditor

    // Start initialization (wait for jQuery if needed)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        initWhenReady();
    }
})();
