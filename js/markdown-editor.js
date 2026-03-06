(() => {
  // js/src/index.js
  (function() {
    "use strict";
    function initWhenReady() {
      if (typeof jQuery === "undefined") {
        setTimeout(initWhenReady, 50);
        return;
      }
      initializeMarkdownEditor(jQuery);
    }
    function initializeMarkdownEditor($) {
      const DEBUG = false;
      function debugLog(message, level = "DEBUG", context = {}) {
        if (!DEBUG && (level === "DEBUG" || level === "INFO")) {
          return;
        }
        if (typeof console === "undefined") {
          return;
        }
        const prefix = `[Markdown Editor ${level}]`;
        if (Object.keys(context).length > 0) {
          switch (level) {
            case "ERROR":
              console.error(prefix, message, context);
              break;
            case "WARNING":
              console.warn(prefix, message, context);
              break;
            case "INFO":
              console.info(prefix, message, context);
              break;
            default:
              console.log(prefix, message, context);
          }
        } else {
          switch (level) {
            case "ERROR":
              console.error(prefix, message);
              break;
            case "WARNING":
              console.warn(prefix, message);
              break;
            case "INFO":
              console.info(prefix, message);
              break;
            default:
              console.log(prefix, message);
          }
        }
      }
      class MarkdownEditor {
        constructor(textarea, options = {}) {
          this.textarea = $(textarea);
          const globalConfig = window.osTicketMarkdownConfig || {};
          debugLog("Global config received", "DEBUG", globalConfig);
          debugLog("Default format from config: " + globalConfig.defaultFormat, "DEBUG");
          this.options = $.extend({
            showToolbar: globalConfig.showToolbar !== void 0 ? globalConfig.showToolbar : true,
            allowFormatSwitch: globalConfig.allowFormatSwitch !== void 0 ? globalConfig.allowFormatSwitch : true,
            previewPosition: "bottom",
            // 'side' oder 'bottom'
            debounceDelay: 500,
            toolbarButtons: [
              "bold",
              "italic",
              "heading",
              "link",
              "code",
              "codeblock",
              "ul",
              "ol",
              "quote",
              "hr",
              "image"
            ],
            shortcuts: true,
            autoInit: true,
            compact: false
            // No preview, minimal toolbar - for secondary textareas
          }, options);
          this.container = null;
          this.toolbar = null;
          this.previewPane = null;
          this.debounceTimer = null;
          this.currentFormat = globalConfig.defaultFormat || "markdown";
          debugLog("Current format set to: " + this.currentFormat, "INFO");
          debugLog("Editor options", "DEBUG", this.options);
          if (this.options.autoInit) {
            this.init();
          }
        }
        /**
         * Initialisiert den Editor
         */
        init() {
          debugLog("Initializing editor for textarea: " + this.textarea.attr("id"), "INFO");
          debugLog("Current format: " + this.currentFormat, "DEBUG");
          if (this.currentFormat !== "html") {
            debugLog("Destroying Redactor (not HTML format)", "DEBUG");
            this.destroyRedactor();
          } else {
            debugLog("Keeping Redactor (HTML format)", "DEBUG");
          }
          if (this.options.allowFormatSwitch) {
            this.createFormatSwitcherStandalone();
          }
          if (this.currentFormat !== "html") {
            this.createContainer();
          }
          if (this.options.showToolbar && this.currentFormat !== "html") {
            this.createToolbar();
          }
          if (this.currentFormat === "markdown" && !this.options.compact) {
            this.createPreview();
            this.setupLivePreview();
          }
          if (this.options.shortcuts && this.currentFormat === "markdown") {
            this.setupKeyboardShortcuts();
          }
          if (this.currentFormat === "markdown" && !this.options.compact) {
            this.setupImageUpload();
          }
          this.setupCannedResponseHandler();
          if (this.currentFormat === "markdown" && this.textarea.val().trim()) {
            this.renderPreview();
          }
          debugLog("Editor initialized successfully", "DEBUG");
        }
        /**
         * Restores Redactor WYSIWYG editor for HTML format
         */
        restoreRedactor() {
          debugLog("Restoring Redactor for HTML format", "INFO");
          if (this.redactorObserver) {
            this.redactorObserver.disconnect();
            this.redactorObserver = null;
            debugLog("Disconnected MutationObserver (allows Redactor creation)", "DEBUG");
          }
          this.textarea.removeData("redactor");
          this.textarea.removeData("redactor-instance");
          this.textarea.removeAttr("data-redactor");
          this.textarea.removeAttr("data-redactor-uuid");
          debugLog("Cleared all Redactor data and attributes", "DEBUG");
          const existingRedactorBox = this.textarea.siblings(".redactor-box");
          const existingRedactorIn = this.textarea.siblings('[class*="redactor-in"]');
          const existingRedactorStyles = this.textarea.siblings(".redactor-styles");
          if (existingRedactorBox.length > 0) {
            debugLog("Found existing .redactor-box, removing...", "DEBUG");
            existingRedactorBox.remove();
          }
          if (existingRedactorIn.length > 0) {
            debugLog("Found existing redactor-in DIVs, removing...", "DEBUG");
            existingRedactorIn.remove();
          }
          if (existingRedactorStyles.length > 0) {
            debugLog("Found existing .redactor-styles DIVs, removing...", "DEBUG");
            existingRedactorStyles.remove();
          }
          if (this.container && this.container.length > 0) {
            if (this.formatSwitcher && this.formatSwitcher.length > 0) {
              this.textarea.insertAfter(this.formatSwitcher);
            } else {
              this.textarea.insertBefore(this.container);
            }
            this.container.hide();
            debugLog("Moved textarea out of markdown container", "DEBUG");
          }
          this.textarea.removeClass("markdown-textarea markdown-active");
          this.textarea.removeAttr("data-markdown-enabled");
          this.textarea.attr("data-wants-redactor", "true");
          this.textarea.addClass("richtext");
          this.textarea.parent().removeClass("-redactor-container");
          debugLog("Removed -redactor-container class from parent", "DEBUG");
          this.textarea.removeAttr("style");
          this.textarea.show();
          this.textarea[0].offsetHeight;
          if (typeof $.fn.redact === "function") {
            try {
              const $textarea = this.textarea;
              const textareaName = $textarea.attr("name");
              setTimeout(() => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _i;
                debugLog("Redactor initialization for:", "DEBUG", textareaName);
                const redactPromise = $.fn.redact($textarea[0]);
                debugLog("Redactor initialization started...", "DEBUG");
                if (redactPromise && typeof redactPromise.then === "function") {
                  redactPromise.then(() => {
                    debugLog("\u2705 Redactor Promise resolved for:", "DEBUG", textareaName);
                    setTimeout(() => {
                      var _a2;
                      const $redactorBox = $textarea.siblings(".redactor-box");
                      const $redactorLayer = $textarea.siblings(".redactor-layer");
                      const $parent = $textarea.parent();
                      debugLog("Redactor box found:", "DEBUG", $redactorBox.length);
                      debugLog("Redactor box visible:", "DEBUG", $redactorBox.is(":visible"));
                      debugLog("Redactor layer found:", "DEBUG", $redactorLayer.length);
                      debugLog("Textarea parent:", "DEBUG", (_a2 = $parent[0]) == null ? void 0 : _a2.tagName, $parent.attr("class"));
                      debugLog("Textarea classes:", "DEBUG", $textarea.attr("class"));
                      debugLog("Textarea visible:", "DEBUG", $textarea.is(":visible"));
                      debugLog("Textarea data-redactor:", "DEBUG", $textarea.data("redactor"));
                      if ($redactorBox.length === 0) {
                        debugLog("\u26A0\uFE0F No .redactor-box found after Promise resolved!", "WARNING");
                        debugLog("Attempting direct Redactor initialization...", "DEBUG");
                        if (typeof $textarea.redactor === "function") {
                          $textarea.redactor({
                            focus: false,
                            toolbar: true,
                            buttons: ["format", "bold", "italic", "lists", "link", "file"]
                          });
                          debugLog("Direct Redactor call completed", "DEBUG");
                        }
                      } else {
                        debugLog("\u2705 Redactor toolbar successfully created!", "DEBUG");
                      }
                    }, 300);
                  }).catch((error) => {
                    debugLog("Redactor Promise rejected:", "ERROR", error);
                  });
                } else {
                  debugLog("WARNING: [MarkdownEditor] $.fn.redact() did not return a Promise - using direct initialization for:", textareaName);
                  if (typeof $textarea.redactor === "function") {
                    debugLog("Attempting direct Redactor.redactor() call...", "DEBUG");
                    debugLog("Textarea state before direct init", "DEBUG", {
                      name: textareaName,
                      classes: $textarea.attr("class"),
                      hasRichtext: $textarea.hasClass("richtext"),
                      hasWantsRedactor: $textarea.attr("data-wants-redactor"),
                      hasMarkdownEnabled: $textarea.attr("data-markdown-enabled"),
                      parent: (_a = $textarea.parent()[0]) == null ? void 0 : _a.tagName,
                      isVisible: $textarea.is(":visible"),
                      display: $textarea.css("display")
                    });
                    try {
                      const result = $textarea.redactor({
                        focus: false,
                        inline: false,
                        // CRITICAL: Force non-inline mode
                        toolbar: true,
                        air: false,
                        // Disable air mode (floating toolbar)
                        buttons: ["format", "bold", "italic", "lists", "link", "file", "image"]
                      });
                      debugLog("Direct Redactor call returned:", "DEBUG", result);
                      debugLog("Redactor rootElement:", "DEBUG", result.rootElement);
                      debugLog("Redactor opts.inline:", "DEBUG", (_b = result.opts) == null ? void 0 : _b.inline);
                      debugLog("Redactor opts.air:", "DEBUG", (_c = result.opts) == null ? void 0 : _c.air);
                      debugLog("Redactor opts.toolbar:", "DEBUG", (_d = result.opts) == null ? void 0 : _d.toolbar);
                      debugLog("Redactor editor.$editor:", "DEBUG", (_e = result.editor) == null ? void 0 : _e.$editor);
                      debugLog("Redactor editor.$editor HTML:", "DEBUG", (_g = (_f = result.editor) == null ? void 0 : _f.$editor[0]) == null ? void 0 : _g.outerHTML);
                      debugLog("Redactor toolbar.$toolbar:", "DEBUG", (_h = result.toolbar) == null ? void 0 : _h.$toolbar);
                      debugLog("Redactor container.$container:", "DEBUG", (_i = result.container) == null ? void 0 : _i.$container);
                    } catch (error) {
                      debugLog("Direct Redactor call threw error:", "ERROR", error);
                    }
                    debugLog("Direct Redactor initialization triggered", "DEBUG");
                    setTimeout(() => {
                      var _a2;
                      const $redactorBox = $textarea.siblings(".redactor-box");
                      debugLog("Redactor box found (direct init):", "DEBUG", $redactorBox.length);
                      debugLog("Checking all possible Redactor containers...", "DEBUG");
                      debugLog("Parent .redactor-box:", "DEBUG", $textarea.parent(".redactor-box").length);
                      debugLog("Next .redactor-box:", "DEBUG", $textarea.next(".redactor-box").length);
                      debugLog("Textarea display:", "DEBUG", $textarea.css("display"));
                      debugLog("Textarea parent HTML:", "DEBUG", (_a2 = $textarea.parent()[0]) == null ? void 0 : _a2.outerHTML);
                      if ($redactorBox.length > 0) {
                        debugLog("\u2705 Direct Redactor initialization successful!", "DEBUG");
                      } else {
                        debugLog("\u274C Redactor box not in DOM - attempting manual insertion...", "WARNING");
                        const redactorInstance = $textarea.data("redactor");
                        if (redactorInstance && redactorInstance.container && redactorInstance.container.$container) {
                          const redactorContainer = redactorInstance.container.$container;
                          debugLog("Found Redactor container in memory:", "DEBUG", redactorContainer);
                          const containerNode = redactorContainer.nodes ? redactorContainer.nodes[0] : redactorContainer[0];
                          if (containerNode) {
                            const $container = $(containerNode);
                            debugLog("Wrapped container node in jQuery:", "DEBUG", $container);
                            $container.insertAfter($textarea);
                            $textarea.hide();
                            debugLog("\u2705 Manually inserted Redactor box into DOM!", "DEBUG");
                          } else {
                            debugLog("\u274C Could not extract DOM node from Redactor container", "ERROR");
                          }
                        } else {
                          debugLog("\u274C Could not find Redactor instance or container", "ERROR");
                        }
                      }
                    }, 500);
                  } else {
                    debugLog("jQuery.redactor() plugin not available!", "ERROR");
                  }
                }
              }, 150);
            } catch (e) {
              debugLog("Failed to initialize Redactor:", "ERROR", e);
            }
          } else {
            debugLog("WARNING: [MarkdownEditor] $.fn.redact not available - cannot restore Redactor");
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
          const $redactorBox = this.textarea.siblings(".redactor-box");
          debugLog("destroyRedactor() called", "DEBUG");
          debugLog("Found .redactor-box elements:", "DEBUG", $redactorBox.length);
          debugLog("Textarea has .richtext class:", "DEBUG", this.textarea.hasClass("richtext"));
          debugLog("Redactor data:", "DEBUG", this.textarea.data("redactor"));
          if (typeof this.textarea.redactor === "function") {
            try {
              this.textarea.redactor("core.destroy");
              debugLog("Destroyed Redactor instance", "DEBUG");
            } catch (e) {
              if (e.message && !e.message.includes("not found") && !e.message.includes("not initialized")) {
                debugLog("WARNING: [MarkdownEditor] Redactor destroy failed: " + e.message, "WARNING");
              }
              debugLog("Redactor destroy skipped (not initialized)", "DEBUG");
            }
          }
          if ($redactorBox.length > 0) {
            $redactorBox.remove();
            debugLog("\u2705 Removed Redactor box from DOM (sibling)", "DEBUG");
          } else {
            const $parentRedactorBox = this.textarea.closest(".redactor-box");
            if ($parentRedactorBox.length > 0) {
              debugLog("Found .redactor-box as PARENT! Moving textarea out and removing box...", "DEBUG");
              this.textarea.insertBefore($parentRedactorBox);
              $parentRedactorBox.remove();
              debugLog("\u2705 Moved textarea out of .redactor-box and removed box", "DEBUG");
            } else {
              debugLog("No .redactor-box found (Redactor was not initialized)", "DEBUG");
            }
          }
          this.textarea.removeData("redactor");
          this.textarea.removeData("redactor-instance");
          this.textarea.show().css({
            "display": "block !important",
            "visibility": "visible !important"
          });
          this.textarea.removeClass("redactor-source redactor-in");
          debugLog("Removed Redactor classes and forced textarea visible", "DEBUG");
          this.textarea.removeClass("richtext");
          this.textarea.attr("data-markdown-enabled", "true");
          this.textarea.addClass("markdown-active");
          this.setupRedactorProtection();
          const self = this;
          setTimeout(() => {
            const $laterRedactorBox = self.textarea.siblings(".redactor-box");
            if ($laterRedactorBox.length > 0) {
              debugLog("Found .redactor-box as sibling after delay! Removing...", "DEBUG");
              $laterRedactorBox.remove();
              self.textarea.show().css({
                "display": "block !important",
                "visibility": "visible !important"
              });
              self.textarea.removeClass("richtext redactor-source redactor-in");
              debugLog("\u2705 Removed delayed Redactor box (sibling)", "DEBUG");
            }
            const $parentRedactorBox = self.textarea.closest(".redactor-box");
            if ($parentRedactorBox.length > 0) {
              debugLog("Found .redactor-box as PARENT after delay! Unwrapping...", "DEBUG");
              self.textarea.unwrap(".redactor-box");
              self.textarea.show().css({
                "display": "block !important",
                "visibility": "visible !important"
              });
              self.textarea.removeClass("richtext redactor-source redactor-in");
              debugLog("\u2705 Unwrapped delayed Redactor box (parent)", "DEBUG");
            }
          }, 300);
          debugLog("Redactor cleanup complete", "DEBUG");
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
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && $(node).hasClass("redactor-box")) {
                  debugLog("Detected Redactor re-initialization! Cleaning up...", "DEBUG");
                  $(node).remove();
                  self.textarea.show();
                  self.textarea.removeClass("richtext");
                  self.textarea.attr("data-markdown-enabled", "true");
                  self.textarea.removeData("redactor");
                }
              });
            });
          });
          if (this.textarea[0].parentNode) {
            observer.observe(this.textarea[0].parentNode, {
              childList: true,
              subtree: false
            });
            this.redactorObserver = observer;
          }
        }
        /**
         * Erstellt den Container-Wrapper um die Textarea
         */
        createContainer() {
          const containerClass = "markdown-editor-container" + (this.options.compact ? " markdown-compact" : "");
          this.container = $("<div>", {
            class: containerClass,
            "data-format": this.currentFormat
          });
          this.textarea.wrap(this.container);
          this.container = this.textarea.parent();
          const editorWrapper = $("<div>", {
            class: "markdown-editor-wrapper"
          });
          this.textarea.wrap(editorWrapper);
          this.textarea.addClass("markdown-textarea");
          this.ensureFormatField();
        }
        /**
         * Ensures a hidden format field exists and is set to current format
         * This tells osTicket to save the thread entry with the selected format
         */
        ensureFormatField() {
          const textareaName = this.textarea.attr("name");
          let formatField = this.textarea.closest("form").find('input[name="format"]');
          if (formatField.length === 0) {
            formatField = this.textarea.closest("form").find(`input[name="format[${textareaName}]"]`);
          }
          if (formatField.length === 0) {
            formatField = $("<input>", {
              type: "hidden",
              name: "format",
              value: this.currentFormat
            });
            this.textarea.after(formatField);
            debugLog(`Created format field with value "${this.currentFormat}"`, "DEBUG");
          } else {
            formatField.val(this.currentFormat);
            debugLog(`Updated existing format field to "${this.currentFormat}"`, "DEBUG");
          }
          this.formatField = formatField;
        }
        /**
         * Erstellt die Toolbar mit allen Buttons
         */
        createToolbar() {
          this.toolbar = $("<div>", {
            class: "markdown-toolbar",
            role: "toolbar",
            "aria-label": "Markdown Formatting Tools"
          });
          const skipInCompact = ["image"];
          this.options.toolbarButtons.forEach((button) => {
            if (this.options.compact && skipInCompact.includes(button)) return;
            const btn = this.createToolbarButton(button);
            if (btn) {
              this.toolbar.append(btn);
            }
          });
          if (!this.options.compact) {
            const previewToggle = this.createPreviewToggle();
            this.toolbar.append(previewToggle);
          }
          this.container.prepend(this.toolbar);
        }
        /**
         * Erstellt einen einzelnen Toolbar-Button
         */
        createToolbarButton(type) {
          const buttons = {
            bold: {
              title: "Bold (Ctrl+B)",
              icon: this.getIcon("bold"),
              action: () => this.wrapSelection("**", "**", "bold text")
            },
            italic: {
              title: "Italic (Ctrl+I)",
              icon: this.getIcon("italic"),
              action: () => this.wrapSelection("*", "*", "italic text")
            },
            heading: {
              title: "Heading (Ctrl+H)",
              icon: this.getIcon("heading"),
              action: () => this.insertHeading()
            },
            link: {
              title: "Link (Ctrl+K)",
              icon: this.getIcon("link"),
              action: () => this.insertLink()
            },
            code: {
              title: "Inline Code",
              icon: this.getIcon("code"),
              action: () => this.wrapSelection("`", "`", "code")
            },
            codeblock: {
              title: "Code Block",
              icon: this.getIcon("codeblock"),
              action: () => this.insertCodeBlock()
            },
            ul: {
              title: "Unordered List",
              icon: this.getIcon("list-ul"),
              action: () => this.insertList("ul")
            },
            ol: {
              title: "Ordered List",
              icon: this.getIcon("list-ol"),
              action: () => this.insertList("ol")
            },
            quote: {
              title: "Blockquote",
              icon: this.getIcon("quote"),
              action: () => this.insertBlockquote()
            },
            hr: {
              title: "Horizontal Rule",
              icon: this.getIcon("hr"),
              action: () => this.insertHorizontalRule()
            },
            image: {
              title: "Insert Image",
              icon: this.getIcon("image"),
              action: () => this._triggerImageFileDialog()
            }
          };
          const config = buttons[type];
          if (!config) return null;
          return $("<button>", {
            type: "button",
            class: "markdown-toolbar-btn",
            "data-action": type,
            title: config.title,
            "aria-label": config.title,
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
          const $wrapper = $("<div>", {
            class: "markdown-format-switcher-wrapper",
            css: {
              "display": "block",
              "width": "100%",
              "margin-bottom": "10px",
              "clear": "both",
              "padding": "5px 0"
            }
          });
          const $label = $("<label>", {
            text: "Format: ",
            css: {
              "font-weight": "bold",
              "margin-right": "10px",
              "display": "inline-block"
            }
          });
          const $select = $("<select>", {
            class: "format-switcher-select",
            "aria-label": "Select input format",
            css: {
              "padding": "1px 30px 6px 10px",
              "border": "1px solid #ccc",
              "border-radius": "4px",
              "font-size": "14px",
              "min-width": "150px",
              "background-color": "#fff"
            },
            change: (e) => this.switchFormat(e.target.value)
          });
          const formats = [
            { value: "markdown", label: "Markdown" },
            { value: "html", label: "HTML" }
          ];
          formats.forEach((format) => {
            $select.append($("<option>", {
              value: format.value,
              text: format.label,
              selected: format.value === this.currentFormat
            }));
          });
          $wrapper.append($label).append($select);
          this.textarea.before($wrapper);
          this.formatSwitcher = $wrapper;
          this.formatSwitcherSelect = $select;
          debugLog("Created standalone format switcher before textarea", "DEBUG");
        }
        /**
         * Erstellt den Format-Switcher Dropdown (for toolbar integration - LEGACY)
         */
        createFormatSwitcher() {
          const switcher = $("<div>", {
            class: "format-switcher"
          });
          const select = $("<select>", {
            class: "format-switcher-select",
            "aria-label": "Select input format",
            change: (e) => this.switchFormat(e.target.value)
          });
          const formats = [
            { value: "markdown", label: "Markdown" },
            { value: "html", label: "HTML" }
          ];
          formats.forEach((format) => {
            select.append($("<option>", {
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
          return $("<button>", {
            type: "button",
            class: "markdown-preview-toggle",
            "data-action": "toggle-preview",
            title: "Toggle Preview",
            "aria-label": "Toggle Preview",
            html: this.getIcon("eye"),
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
          this.textarea.closest("td").find(".markdown-preview-container").remove();
          debugLog("Removed all existing preview containers", "DEBUG");
          const previewContainer = $("<div>", {
            class: "markdown-preview-container"
          });
          const previewHeader = $("<div>", {
            class: "markdown-preview-header",
            html: "<span>Preview</span>"
          });
          this.previewPane = $("<div>", {
            class: "markdown-preview",
            "aria-live": "polite",
            "aria-label": "Markdown Preview"
          });
          previewContainer.append(previewHeader, this.previewPane);
          if (this.options.previewPosition === "side") {
            this.container.addClass("preview-side");
            const contentArea = $("<div>", {
              class: "markdown-content-area"
            });
            this.textarea.parent().wrap(contentArea);
            this.textarea.parent().parent().append(previewContainer);
          } else {
            this.container.addClass("preview-bottom");
            this.textarea.parent().after(previewContainer);
          }
          debugLog("Created new preview container", "DEBUG");
        }
        /**
         * Richtet Live-Preview mit Debouncing ein
         */
        setupLivePreview() {
          this.textarea.on("input", () => {
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
          if (!this.previewPane) return;
          const markdown = this.textarea.val();
          if (!markdown.trim()) {
            this.previewPane.html('<p class="preview-empty">Preview wird hier angezeigt...</p>');
            return;
          }
          const config = window.osTicketMarkdownConfig || {};
          const previewApiUrl = config.previewApiUrl;
          if (previewApiUrl) {
            debugLog("Rendering preview via backend API", "DEBUG", { url: previewApiUrl });
            $.ajax({
              url: previewApiUrl,
              method: "POST",
              contentType: "application/json",
              data: JSON.stringify({ markdown }),
              dataType: "json",
              success: (response) => {
                if (response.success && response.html) {
                  debugLog("Backend preview rendered successfully", "DEBUG");
                  this.previewPane.html(response.html);
                } else {
                  debugLog("Backend preview failed: Invalid response", "ERROR", response);
                  this.fallbackToClientPreview(markdown);
                }
              },
              error: (xhr, status, error) => {
                debugLog("Backend preview failed: " + error, "ERROR", { status, xhr });
                this.fallbackToClientPreview(markdown);
              }
            });
          } else {
            debugLog("No backend API configured - using client-side preview", "WARN");
            this.fallbackToClientPreview(markdown);
          }
        }
        /**
         * Fallback zu Client-Side Preview
         */
        fallbackToClientPreview(markdown) {
          debugLog("Using client-side preview fallback", "DEBUG");
          const html = this.simpleMarkdownToHtml(markdown);
          this.previewPane.html(html);
        }
        /**
         * Einfacher Client-Side Markdown-to-HTML Converter
         * (Fallback wenn Backend nicht verfügbar)
         */
        simpleMarkdownToHtml(markdown) {
          let html = markdown;
          html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
          html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
          html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
          html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
          html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
          html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
          html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
          html = html.replace(/`(.+?)`/g, "<code>$1</code>");
          html = html.replace(/^\* (.+)$/gim, "___UL___<li>$1</li>");
          html = html.replace(/^\d+\. (.+)$/gim, "___OL___<li>$1</li>");
          html = html.replace(/(___UL___<li>.*<\/li>\n?)+/g, function(match) {
            return "<ul>" + match.replace(/___UL___/g, "") + "</ul>";
          });
          html = html.replace(/(___OL___<li>.*<\/li>\n?)+/g, function(match) {
            return "<ol>" + match.replace(/___OL___/g, "") + "</ol>";
          });
          html = html.replace(/^> (.+)$/gim, "<blockquote>$1</blockquote>");
          html = html.replace(/^---$/gim, "<hr>");
          html = html.replace(/\n\n/g, "</p><p>");
          html = html.replace(/\n/g, "<br>");
          if (!html.match(/^<(h\d|ul|ol|pre|blockquote)/)) {
            html = "<p>" + html + "</p>";
          }
          return html;
        }
        /**
         * Toggle Preview (mobile)
         */
        togglePreview() {
          this.container.toggleClass("preview-hidden");
        }
        /**
         * Keyboard-Shortcuts Setup
         */
        setupKeyboardShortcuts() {
          this.textarea.on("keydown", (e) => {
            const isMod = e.ctrlKey || e.metaKey;
            if (!isMod) return;
            switch (e.key.toLowerCase()) {
              case "b":
                e.preventDefault();
                this.wrapSelection("**", "**", "bold text");
                break;
              case "i":
                e.preventDefault();
                this.wrapSelection("*", "*", "italic text");
                break;
              case "k":
                e.preventDefault();
                this.insertLink();
                break;
              case "h":
                e.preventDefault();
                this.insertHeading();
                break;
            }
          });
        }
        // =====================================================================
        // Image Upload (Paste & Drag-and-Drop)
        // =====================================================================
        /**
         * Setup image paste and drag-and-drop upload handlers
         *
         * Uses osTicket's draft attachment API for uploads.
         * Draft namespace/ID is read from textarea data attributes
         * set by osTicket's Draft::getDraftAndDataAttrs().
         */
        setupImageUpload() {
          this._teardownImageUploadHandlers();
          this.draftId = this.textarea.attr("data-draft-id") || null;
          this.draftNamespace = this.textarea.attr("data-draft-namespace") || null;
          this.draftObjectId = this.textarea.attr("data-draft-object-id") || null;
          if (typeof this.uploadCounter === "undefined") {
            this.uploadCounter = 0;
          }
          this._updateUploadUrl();
          if (!this.uploadUrl) {
            debugLog("No draft namespace found - image upload disabled", "WARNING");
            return;
          }
          const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];
          this.textarea.on("paste.markdownImageUpload", (e) => {
            if (this.currentFormat !== "markdown") return;
            const clipboardData = e.originalEvent.clipboardData;
            if (!clipboardData || !clipboardData.items) return;
            const imageFiles = [];
            for (let i = 0; i < clipboardData.items.length; i++) {
              const item = clipboardData.items[i];
              if (ALLOWED_IMAGE_TYPES.includes(item.type)) {
                const file = item.getAsFile();
                if (file) imageFiles.push(file);
              }
            }
            if (imageFiles.length === 0) return;
            e.preventDefault();
            imageFiles.forEach((file) => this._uploadImage(file));
          });
          const $dropZone = this.container;
          $dropZone.on("dragover.markdownImageUpload", (e) => {
            if (this.currentFormat !== "markdown") return;
            e.preventDefault();
            e.stopPropagation();
            $dropZone.addClass("markdown-drop-active");
          });
          $dropZone.on("dragleave.markdownImageUpload", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!$.contains($dropZone[0], e.relatedTarget)) {
              $dropZone.removeClass("markdown-drop-active");
            }
          });
          $dropZone.on("drop.markdownImageUpload", (e) => {
            var _a;
            if (this.currentFormat !== "markdown") return;
            e.preventDefault();
            e.stopPropagation();
            $dropZone.removeClass("markdown-drop-active");
            const files = (_a = e.originalEvent.dataTransfer) == null ? void 0 : _a.files;
            if (!files || files.length === 0) return;
            for (let i = 0; i < files.length; i++) {
              if (ALLOWED_IMAGE_TYPES.includes(files[i].type)) {
                this._uploadImage(files[i]);
              }
            }
          });
          debugLog("Image upload handlers registered", "DEBUG");
        }
        /**
         * Remove image upload event handlers
         */
        _teardownImageUploadHandlers() {
          this.textarea.off("paste.markdownImageUpload");
          if (this.container) {
            this.container.off("dragover.markdownImageUpload dragleave.markdownImageUpload drop.markdownImageUpload");
          }
        }
        /**
         * Build or update the upload URL based on current draft state
         */
        _updateUploadUrl() {
          let draftPath;
          if (this.draftId) {
            draftPath = this.draftId + "/attach";
          } else if (this.draftNamespace) {
            let ns = this.draftNamespace;
            if (this.draftObjectId) {
              ns += "." + this.draftObjectId;
            }
            draftPath = ns + "/attach";
          } else {
            this.uploadUrl = null;
            return;
          }
          this.uploadUrl = "ajax.php/draft/" + draftPath;
        }
        /**
         * Upload a single image file to osTicket's draft attachment API
         *
         * @param {File} file - The image file to upload
         */
        _uploadImage(file) {
          this.uploadCounter++;
          const uploadId = this.uploadCounter;
          const placeholder = `![Uploading image-${uploadId}...]()`;
          this._insertTextAtCursor(placeholder);
          this._showUploadProgress(uploadId);
          const formData = new FormData();
          formData.append("file[]", file, file.name || "pasted-image.png");
          const csrfToken = $("meta[name=csrf_token]").attr("content") || $('input[name="__CSRFToken__"]').val();
          if (!csrfToken) {
            debugLog("CSRF token not found - upload aborted", "ERROR");
            this._replacePlaceholder(placeholder, "");
            this._hideUploadProgress(uploadId);
            this._showUploadError("Upload failed: Security token not found. Please reload the page.");
            return;
          }
          formData.append("__CSRFToken__", csrfToken);
          $.ajax({
            url: this.uploadUrl,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            dataType: "json",
            global: false,
            success: (response) => {
              this._handleUploadSuccess(response, placeholder, uploadId);
            },
            error: (xhr) => {
              this._handleUploadError(xhr, placeholder, uploadId);
            }
          });
        }
        /**
         * Handle successful image upload
         *
         * @param {Object} response - JSON response from osTicket API
         * @param {string} placeholder - The placeholder text to replace
         * @param {number} uploadId - Upload identifier
         */
        _handleUploadSuccess(response, placeholder, uploadId) {
          this._hideUploadProgress(uploadId);
          const keys = Object.keys(response);
          if (keys.length === 0) {
            this._replacePlaceholder(placeholder, "![Upload failed]()");
            return;
          }
          const fileData = response[keys[0]];
          const fileName = keys[0];
          if (fileData.draft_id && !this.draftId) {
            this.draftId = fileData.draft_id;
            this._updateUploadUrl();
            debugLog("Draft ID set to: " + this.draftId, "DEBUG");
          }
          const rawUrl = fileData.url || "file.php?key=" + String(fileData.id) + "&disposition=inline";
          const imageUrl = /^https?:\/\//.test(rawUrl) || /file\.php\?/.test(rawUrl) ? rawUrl : "#invalid-url";
          const altText = fileName.replace(/\.[^.]+$/, "").replace(/[\[\]()]/g, "");
          const markdown = `![${altText}](${imageUrl})`;
          this._replacePlaceholder(placeholder, markdown);
          debugLog("Image uploaded successfully: " + fileName, "INFO");
        }
        /**
         * Handle failed image upload
         *
         * @param {Object} xhr - jQuery XHR object
         * @param {string} placeholder - The placeholder text to replace
         * @param {number} uploadId - Upload identifier
         */
        _handleUploadError(xhr, placeholder, uploadId) {
          this._hideUploadProgress(uploadId);
          let errorMsg = "Upload failed";
          try {
            const resp = JSON.parse(xhr.responseText);
            if (resp.error) errorMsg = String(resp.error).substring(0, 200);
          } catch (e) {
            if (xhr.responseText) {
              errorMsg = xhr.responseText.replace(/<[^>]*>/g, "").substring(0, 200);
            }
          }
          this._replacePlaceholder(placeholder, "");
          this._showUploadError(errorMsg);
          debugLog("Image upload failed: " + errorMsg, "ERROR");
        }
        /**
         * Insert text at current cursor position in textarea
         *
         * @param {string} text - Text to insert
         */
        _insertTextAtCursor(text) {
          const textarea = this.textarea[0];
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const value = textarea.value;
          let prefix = "";
          if (start > 0 && value[start - 1] !== "\n") {
            prefix = "\n";
          }
          let suffix = "";
          if (end < value.length && value[end] !== "\n") {
            suffix = "\n";
          }
          const insertText = prefix + text + suffix;
          textarea.value = value.substring(0, start) + insertText + value.substring(end);
          const newPos = start + insertText.length;
          textarea.setSelectionRange(newPos, newPos);
          this.textarea.trigger("input");
        }
        /**
         * Replace placeholder text in textarea
         *
         * @param {string} placeholder - Text to find and replace
         * @param {string} replacement - Replacement text
         */
        _replacePlaceholder(placeholder, replacement) {
          const textarea = this.textarea[0];
          const value = textarea.value;
          const index = value.indexOf(placeholder);
          if (index === -1) {
            debugLog("Placeholder not found in textarea", "WARNING");
            return;
          }
          textarea.value = value.substring(0, index) + replacement + value.substring(index + placeholder.length);
          const newPos = index + replacement.length;
          textarea.setSelectionRange(newPos, newPos);
          this.textarea.trigger("input");
        }
        /**
         * Show upload progress indicator
         *
         * @param {number} uploadId - Upload identifier
         */
        _showUploadProgress(uploadId) {
          if (!this.container) return;
          const $indicator = $("<div>", {
            class: "markdown-upload-indicator",
            "data-upload-id": uploadId,
            html: '<span class="markdown-upload-spinner"></span> <span class="markdown-upload-text">Uploading image...</span>'
          });
          this.container.append($indicator);
        }
        /**
         * Hide upload progress indicator
         *
         * @param {number} uploadId - Upload identifier
         */
        _hideUploadProgress(uploadId) {
          if (!this.container) return;
          this.container.find(`.markdown-upload-indicator[data-upload-id="${uploadId}"]`).remove();
        }
        /**
         * Show upload error notification
         *
         * @param {string} message - Error message to display
         */
        _showUploadError(message) {
          if (!this.container) return;
          const $error = $("<div>", {
            class: "markdown-upload-error",
            text: message
          });
          this.container.append($error);
          setTimeout(() => $error.fadeOut(300, () => $error.remove()), 5e3);
        }
        /**
         * Open file dialog for image upload via toolbar button
         */
        _triggerImageFileDialog() {
          if (!this.uploadUrl) {
            this._showUploadError("Image upload not available \u2014 no draft context found.");
            return;
          }
          const ALLOWED_TYPES = "image/jpeg,image/png,image/gif,image/webp,image/bmp";
          const $input = $("<input>", {
            type: "file",
            accept: ALLOWED_TYPES,
            multiple: true,
            css: { display: "none" }
          });
          $input.on("change", (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            for (let i = 0; i < files.length; i++) {
              this._uploadImage(files[i]);
            }
            $input.remove();
          });
          $("body").append($input);
          $input[0].click();
          setTimeout(() => {
            if ($input.parent().length) $input.remove();
          }, 6e4);
        }
        /**
         * Wraps selected text with prefix and suffix
         */
        wrapSelection(prefix, suffix, placeholder = "") {
          const textarea = this.textarea[0];
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
          this.textarea.trigger("input");
        }
        /**
         * Fügt Heading ein (cycle durch H1-H6)
         */
        insertHeading() {
          const textarea = this.textarea[0];
          const start = textarea.selectionStart;
          const text = textarea.value;
          const lineStart = text.lastIndexOf("\n", start - 1) + 1;
          const lineText = text.substring(lineStart, start);
          const hashMatch = lineText.match(/^(#{1,6})\s*/);
          let hashCount = hashMatch ? hashMatch[1].length : 0;
          hashCount = hashCount % 6 + 1;
          const hashes = "#".repeat(hashCount) + " ";
          if (hashMatch) {
            const newText = text.substring(0, lineStart) + text.substring(lineStart).replace(/^#{1,6}\s*/, hashes);
            textarea.value = newText;
            textarea.setSelectionRange(start, start);
          } else {
            textarea.value = text.substring(0, lineStart) + hashes + text.substring(lineStart);
            textarea.setSelectionRange(start + hashes.length, start + hashes.length);
          }
          this.textarea.trigger("input");
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
          const linkText = selection || "Link Text";
          const url = prompt("URL eingeben:", "https://");
          if (url && url !== "https://") {
            const link = `[${linkText}](${url})`;
            textarea.value = text.substring(0, start) + link + text.substring(end);
            const newPos = start + link.length;
            textarea.setSelectionRange(newPos, newPos);
            this.textarea.trigger("input");
          }
        }
        /**
         * Fügt Code-Block ein
         */
        insertCodeBlock() {
          const language = prompt("Programmiersprache (optional):", "javascript") || "";
          this.wrapSelection(`\`\`\`${language}
`, "\n```", "code here");
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
          const lines = selection ? selection.split("\n") : ["List Item"];
          const prefix = type === "ul" ? "- " : "1. ";
          const list = lines.map((line, index) => {
            if (type === "ol") {
              return `${index + 1}. ${line}`;
            }
            return `${prefix}${line}`;
          }).join("\n");
          textarea.value = text.substring(0, start) + list + text.substring(end);
          const newPos = start + list.length;
          textarea.setSelectionRange(newPos, newPos);
          this.textarea.trigger("input");
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
          const lines = selection ? selection.split("\n") : ["Quote"];
          const quote = lines.map((line) => `> ${line}`).join("\n");
          textarea.value = text.substring(0, start) + quote + text.substring(end);
          const newPos = start + quote.length;
          textarea.setSelectionRange(newPos, newPos);
          this.textarea.trigger("input");
        }
        /**
         * Fügt Horizontal Rule ein
         */
        insertHorizontalRule() {
          const textarea = this.textarea[0];
          const start = textarea.selectionStart;
          const text = textarea.value;
          const hr = "\n\n---\n\n";
          textarea.value = text.substring(0, start) + hr + text.substring(start);
          const newPos = start + hr.length;
          textarea.setSelectionRange(newPos, newPos);
          this.textarea.trigger("input");
        }
        // =================================================================
        // Canned Response Markdown Integration
        // =================================================================
        /**
         * Convert simple HTML to Markdown
         *
         * Handles common formatting from osTicket canned responses:
         * bold, italic, links, images, lists, headings, blockquotes, hr, br, p
         *
         * @param {string} html - HTML string to convert
         * @returns {string} Markdown string
         */
        htmlToMarkdown(html) {
          if (!html || typeof html !== "string") return "";
          let md = html;
          md = md.replace(/\r\n/g, "\n");
          md = md.replace(/<!--[\s\S]*?-->/g, "");
          for (let i = 1; i <= 6; i++) {
            const hashes = "#".repeat(i);
            const re = new RegExp(`<h${i}[^>]*>(.*?)<\\/h${i}>`, "gi");
            md = md.replace(re, `

${hashes} $1

`);
          }
          md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
            const lines = this._stripTags(content).trim().split("\n");
            return "\n\n" + lines.map((l) => "> " + l.trim()).join("\n") + "\n\n";
          });
          md = md.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");
          md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
            let idx = 0;
            const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, li) => {
              idx++;
              return idx + ". " + this._stripTags(li).trim() + "\n";
            });
            return "\n\n" + items.trim() + "\n\n";
          });
          md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
            const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, li) => {
              return "- " + this._stripTags(li).trim() + "\n";
            });
            return "\n\n" + items.trim() + "\n\n";
          });
          md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n");
          md = md.replace(/<br\s*\/?>/gi, "\n");
          md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*?)["'][^>]*\/?>/gi, "![$2]($1)");
          md = md.replace(/<img[^>]*alt=["']([^"']*?)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi, "![$1]($2)");
          md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, "![]($1)");
          md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)");
          md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**");
          md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*");
          md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
          md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "\n\n```\n$1\n```\n\n");
          md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n\n```\n$1\n```\n\n");
          md = this._stripTags(md);
          md = this._decodeEntities(md);
          md = md.replace(/\n{3,}/g, "\n\n");
          return md.trim();
        }
        /**
         * Strip HTML tags from string
         * @param {string} html
         * @returns {string}
         */
        _stripTags(html) {
          const tmp = document.createElement("div");
          tmp.innerHTML = html;
          return tmp.textContent || tmp.innerText || "";
        }
        /**
         * Decode HTML entities
         * @param {string} text
         * @returns {string}
         */
        _decodeEntities(text) {
          const tmp = document.createElement("textarea");
          tmp.innerHTML = text;
          return tmp.value;
        }
        /**
         * Setup handler to intercept osTicket's canned response insertion
         *
         * osTicket's scp.js binds a change handler on #cannedResp that fetches
         * the HTML canned response via AJAX and inserts it into Redactor.
         * When Markdown mode is active, we intercept this and handle it ourselves
         * by converting HTML to Markdown before insertion.
         *
         * Strategy: We remove osTicket's handler and replace it with our own
         * that handles both Markdown and HTML modes. We use a delayed setup
         * to ensure scp.js has already bound its handler before we replace it.
         */
        setupCannedResponseHandler() {
          const self = this;
          const $form = this.textarea.closest("form");
          setTimeout(() => {
            const $cannedSelect = $form.find("#cannedResp");
            if ($cannedSelect.length === 0) {
              return;
            }
            if ($cannedSelect.data("markdownCannedBound")) {
              return;
            }
            $cannedSelect.data("markdownCannedBound", true);
            $cannedSelect.off("change");
            $cannedSelect.on("change", function() {
              const cid = $(this).val();
              if (!cid || cid === "0") return;
              const tid = $(":input[name=id]", $form).val();
              $(this).find("option:first").attr("selected", "selected").parent("select");
              let url = "ajax.php/kb/canned-response/" + cid + ".json";
              if (tid) {
                url = "ajax.php/tickets/" + tid + "/canned-resp/" + cid + ".json";
              }
              $.ajax({
                type: "GET",
                url,
                dataType: "json",
                cache: false,
                success: function(canned) {
                  if (canned.response) {
                    self._insertCannedResponse(canned.response);
                  }
                  const ca = $(".attachments", $form);
                  if (canned.files && ca.length) {
                    const fdb = ca.find(".dropzone").data("dropbox");
                    if (fdb) {
                      $.each(canned.files, function(i, j) {
                        fdb.addNode(j);
                      });
                    }
                  }
                }
              });
            });
            debugLog("Canned response handler initialized", "DEBUG");
          }, 500);
        }
        /**
         * Insert canned response content into the active editor
         *
         * If Markdown mode is active: convert HTML to Markdown and insert into textarea
         * If HTML mode is active: insert HTML via Redactor
         *
         * @param {string} htmlContent - HTML content from canned response API
         */
        _insertCannedResponse(htmlContent) {
          if (this.currentFormat === "markdown" || this.currentFormat === "text") {
            const markdown = this.htmlToMarkdown(htmlContent);
            debugLog("Inserting canned response as Markdown", "DEBUG", {
              htmlLength: htmlContent.length,
              mdLength: markdown.length
            });
            this._insertTextAtCursor(markdown);
          } else {
            const redactor = $R("#response.richtext");
            if (redactor) {
              redactor.api("selection.restore");
              redactor.insertion.insertHtml(htmlContent);
            } else {
              const box = this.textarea;
              box.val(box.val() + htmlContent);
            }
          }
        }
        /**
         * Wechselt das Format (Markdown, HTML, Text)
         */
        switchFormat(newFormat) {
          debugLog("Switching format from " + this.currentFormat + " to " + newFormat, "INFO");
          const oldFormat = this.currentFormat;
          this.currentFormat = newFormat;
          this.container.attr("data-format", newFormat);
          if (this.formatField) {
            this.formatField.val(newFormat);
            debugLog("Updated format field to: " + newFormat, "DEBUG");
          }
          this.textarea.removeClass("markdown-active markdown-textarea");
          this.textarea.removeAttr("data-markdown-enabled");
          this.textarea.removeAttr("data-wants-redactor");
          if (newFormat === "markdown") {
            this.textarea.addClass("markdown-active markdown-textarea");
            this.textarea.attr("data-markdown-enabled", "true");
          }
          if (newFormat === "html") {
            debugLog("Switching to HTML format", "DEBUG");
            this.textarea.closest("td").find(".markdown-preview-container").remove();
            this.previewPane = null;
            debugLog("Removed all preview containers", "DEBUG");
            if (this.toolbar) {
              this.toolbar.remove();
              this.toolbar = null;
              debugLog("Removed Markdown toolbar", "DEBUG");
            }
            this.restoreRedactor();
          } else if (newFormat === "markdown") {
            debugLog("Switching to Markdown format", "DEBUG");
            if (oldFormat === "html") {
              this.destroyRedactor();
            }
            if (!this.container || this.container.length === 0) {
              this.createContainer();
              debugLog("Created markdown container", "DEBUG");
            } else {
              this.container.show();
              this.container.append(this.textarea);
              debugLog("Restored textarea to markdown container", "DEBUG");
            }
            if (this.options.showToolbar && !this.toolbar) {
              this.createToolbar();
              debugLog("Created Markdown toolbar", "DEBUG");
            }
            if (!this.previewPane && !this.options.compact) {
              this.createPreview();
              this.setupLivePreview();
              debugLog("Created Markdown preview", "DEBUG");
            }
            if (!this.options.compact) {
              this.setupImageUpload();
            }
            if (this.toolbar) {
              this.toolbar.find(".markdown-toolbar-btn").show();
              this.toolbar.show();
            }
            if (this.previewPane && this.textarea.val().trim()) {
              this.renderPreview();
            }
          }
          this.textarea.trigger("formatChanged", [oldFormat, newFormat]);
          debugLog(`Format switch complete: ${oldFormat} \u2192 ${newFormat}`, "DEBUG");
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
            "list-ul": '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>',
            "list-ol": '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>',
            quote: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>',
            hr: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 13H5v-2h14v2z"/></svg>',
            image: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
            eye: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
          };
          return icons[type] || "";
        }
        /**
         * Zerstört den Editor
         */
        destroy() {
          if (this.redactorObserver) {
            this.redactorObserver.disconnect();
            this.redactorObserver = null;
          }
          if (this.toolbar) this.toolbar.remove();
          if (this.previewPane) this.previewPane.parent().remove();
          this.textarea.unwrap();
          this.textarea.unwrap();
          this.textarea.removeClass("markdown-textarea markdown-active");
          this.textarea.off("input keydown paste.markdownImageUpload");
          if (this.container) {
            this.container.off("dragover.markdownImageUpload dragleave.markdownImageUpload drop.markdownImageUpload");
          }
          debugLog("Editor destroyed", "DEBUG");
        }
      }
      $.fn.markdownEditor = function(options) {
        return this.each(function() {
          const $this = $(this);
          if ($this.data("markdownEditor")) {
            return;
          }
          const editor = new MarkdownEditor(this, options);
          $this.data("markdownEditor", editor);
        });
      };
      function preventRedactorReInitialization() {
        $(document).on("ajaxStop.markdownProtection", function() {
          $('textarea[data-markdown-enabled="true"], textarea.markdown-active').each(function() {
            const $textarea = $(this);
            if ($textarea.attr("data-wants-redactor") === "true") {
              debugLog("Skipping protection - textarea wants Redactor:", "DEBUG", $textarea.attr("name"));
              return;
            }
            $textarea.removeClass("richtext");
            $textarea.removeData("redactor");
            $textarea.removeData("redactor-instance");
            debugLog("Protected textarea from Redactor re-init:", "DEBUG", $textarea.attr("name"));
          });
        });
        $(document).on("ajaxComplete.markdownProtection", function() {
          $('textarea[data-markdown-enabled="true"], textarea.markdown-active').each(function() {
            const $textarea = $(this);
            if ($textarea.attr("data-wants-redactor") === "true") {
              return;
            }
            const $redactorBox = $textarea.siblings(".redactor-box");
            if ($redactorBox.length > 0) {
              debugLog("Redactor was re-initialized! Destroying immediately...", "DEBUG");
              if (typeof $textarea.redactor === "function") {
                try {
                  $textarea.redactor("core.destroy");
                } catch (e) {
                }
              }
              $redactorBox.remove();
              $textarea.show();
              $textarea.removeClass("richtext");
              $textarea.removeData("redactor");
            }
          });
        });
        debugLog("Installed Redactor re-initialization protection", "DEBUG");
      }
      $(document).ready(function() {
        debugLog("Initializing auto-detection...", "DEBUG");
        preventRedactorReInitialization();
        const primarySelectors = [
          'textarea[name="response"]',
          // Staff reply
          'textarea[name="message"]',
          // New ticket message
          'textarea[name="note"]',
          // Internal note
          "textarea.markdown-enabled",
          // Explizit markierte Textareas
          'textarea[data-markdown="true"]'
          // Data-Attribute
        ];
        const secondarySelectors = [
          "textarea.richtext"
          // osTicket custom form fields with WYSIWYG
        ];
        const selectors = [...primarySelectors, ...secondarySelectors];
        function isPrimaryTextarea($textarea) {
          const name = $textarea.attr("name") || "";
          return ["response", "message", "note"].includes(name) || $textarea.hasClass("markdown-enabled") || $textarea.attr("data-markdown") === "true";
        }
        function initializeMarkdownEditors() {
          let attemptCount = 0;
          const maxAttempts = 10;
          const pollInterval = 200;
          function tryInitialize() {
            attemptCount++;
            selectors.forEach((selector) => {
              const $textareas = $(selector);
              if ($textareas.length > 0) {
                debugLog(`Found ${$textareas.length} textarea(s) matching ${selector}`, "DEBUG");
                $textareas.each(function() {
                  const $textarea = $(this);
                  if ($textarea.data("markdownEditor")) {
                    return;
                  }
                  const hasRedactor = $textarea.data("redactor") || $textarea.siblings(".redactor-box").length > 0;
                  if (hasRedactor || attemptCount >= maxAttempts) {
                    const compact = !isPrimaryTextarea($textarea);
                    debugLog(`Initializing editor for textarea: ${$textarea.attr("name")} (attempt ${attemptCount}, compact: ${compact})`, "INFO");
                    $textarea.markdownEditor({
                      previewPosition: "bottom",
                      debounceDelay: 500,
                      compact
                    });
                  }
                });
              }
            });
            if (attemptCount < maxAttempts) {
              let hasUninitialized = false;
              selectors.forEach((selector) => {
                $(selector).each(function() {
                  if (!$(this).data("markdownEditor")) {
                    hasUninitialized = true;
                  }
                });
              });
              if (hasUninitialized) {
                setTimeout(tryInitialize, pollInterval);
              } else {
                debugLog("All textareas initialized successfully", "DEBUG");
              }
            } else {
              debugLog("Initialization complete (max attempts reached)", "DEBUG");
            }
          }
          tryInitialize();
        }
        initializeMarkdownEditors();
        const observer = new MutationObserver(function(mutations) {
          let hasNewTextareas = false;
          mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
              if (node.nodeType !== Node.ELEMENT_NODE) return;
              const $node = $(node);
              if ($node.is("textarea")) {
                hasNewTextareas = true;
              }
              if ($node.find("textarea").length > 0) {
                hasNewTextareas = true;
              }
            });
          });
          if (hasNewTextareas) {
            debugLog("DOM mutation detected - checking for new textareas", "DEBUG");
            setTimeout(function() {
              selectors.forEach((selector) => {
                const $textareas = $(selector);
                $textareas.each(function() {
                  const $textarea = $(this);
                  if ($textarea.data("markdownEditor")) {
                    return;
                  }
                  if ($textarea.is(":visible") || $textarea.parent().is(":visible")) {
                    const compact = !isPrimaryTextarea($textarea);
                    debugLog(`Initializing dynamically added textarea: ${$textarea.attr("name")} (compact: ${compact})`, "INFO");
                    $textarea.markdownEditor({
                      previewPosition: "bottom",
                      debounceDelay: 500,
                      compact
                    });
                  }
                });
              });
            }, 500);
          }
        });
        observer.observe(document.body, {
          childList: true,
          // Watch for added/removed nodes
          subtree: true
          // Watch entire subtree
        });
        debugLog("MutationObserver started for dynamic textareas", "INFO");
      });
      window.MarkdownEditor = MarkdownEditor;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initWhenReady);
    } else {
      initWhenReady();
    }
  })();
})();
//# sourceMappingURL=markdown-editor.js.map
