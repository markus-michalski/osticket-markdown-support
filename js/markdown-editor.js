(() => {
  // js/src/globals.js
  var $ = null;
  var DEBUG = false;
  function init(jq, debug = false) {
    $ = jq;
    DEBUG = debug;
  }

  // js/src/utils.js
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
  function insertTextAtCursor(editor, text) {
    const textarea = editor.textarea[0];
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
    editor.textarea.trigger("input");
  }
  function replacePlaceholder(editor, placeholder, replacement) {
    const textarea = editor.textarea[0];
    const value = textarea.value;
    const index = value.indexOf(placeholder);
    if (index === -1) {
      debugLog("Placeholder not found in textarea", "WARNING");
      return;
    }
    textarea.value = value.substring(0, index) + replacement + value.substring(index + placeholder.length);
    const newPos = index + replacement.length;
    textarea.setSelectionRange(newPos, newPos);
    editor.textarea.trigger("input");
  }

  // js/src/icons.js
  var icons = {
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
  function getIcon(type) {
    return icons[type] || "";
  }

  // js/src/toolbar.js
  function createToolbar(editor) {
    editor.toolbar = $("<div>", {
      class: "markdown-toolbar",
      role: "toolbar",
      "aria-label": "Markdown Formatting Tools"
    });
    const skipInCompact = ["image"];
    editor.options.toolbarButtons.forEach((button) => {
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
  function createToolbarButton(editor, type) {
    const buttons = {
      bold: {
        title: "Bold (Ctrl+B)",
        icon: getIcon("bold"),
        action: () => editor.wrapSelection("**", "**", "bold text")
      },
      italic: {
        title: "Italic (Ctrl+I)",
        icon: getIcon("italic"),
        action: () => editor.wrapSelection("*", "*", "italic text")
      },
      heading: {
        title: "Heading (Ctrl+H)",
        icon: getIcon("heading"),
        action: () => editor.insertHeading()
      },
      link: {
        title: "Link (Ctrl+K)",
        icon: getIcon("link"),
        action: () => editor.insertLink()
      },
      code: {
        title: "Inline Code",
        icon: getIcon("code"),
        action: () => editor.wrapSelection("`", "`", "code")
      },
      codeblock: {
        title: "Code Block",
        icon: getIcon("codeblock"),
        action: () => editor.insertCodeBlock()
      },
      ul: {
        title: "Unordered List",
        icon: getIcon("list-ul"),
        action: () => editor.insertList("ul")
      },
      ol: {
        title: "Ordered List",
        icon: getIcon("list-ol"),
        action: () => editor.insertList("ol")
      },
      quote: {
        title: "Blockquote",
        icon: getIcon("quote"),
        action: () => editor.insertBlockquote()
      },
      hr: {
        title: "Horizontal Rule",
        icon: getIcon("hr"),
        action: () => editor.insertHorizontalRule()
      },
      image: {
        title: "Insert Image",
        icon: getIcon("image"),
        action: () => editor._triggerImageFileDialog()
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
        editor.textarea.focus();
      }
    });
  }
  function createPreviewToggle(editor) {
    return $("<button>", {
      type: "button",
      class: "markdown-preview-toggle",
      "data-action": "toggle-preview",
      title: "Toggle Preview",
      "aria-label": "Toggle Preview",
      html: getIcon("eye"),
      click: (e) => {
        e.preventDefault();
        editor.togglePreview();
      }
    });
  }

  // js/src/preview.js
  function createPreview(editor) {
    editor.textarea.closest("td").find(".markdown-preview-container").remove();
    debugLog("Removed all existing preview containers", "DEBUG");
    const previewContainer = $("<div>", {
      class: "markdown-preview-container"
    });
    const previewHeader = $("<div>", {
      class: "markdown-preview-header",
      html: "<span>Preview</span>"
    });
    editor.previewPane = $("<div>", {
      class: "markdown-preview",
      "aria-live": "polite",
      "aria-label": "Markdown Preview"
    });
    previewContainer.append(previewHeader, editor.previewPane);
    if (editor.options.previewPosition === "side") {
      editor.container.addClass("preview-side");
      const contentArea = $("<div>", {
        class: "markdown-content-area"
      });
      editor.textarea.parent().wrap(contentArea);
      editor.textarea.parent().parent().append(previewContainer);
    } else {
      editor.container.addClass("preview-bottom");
      editor.textarea.parent().after(previewContainer);
    }
    debugLog("Created new preview container", "DEBUG");
  }
  function setupLivePreview(editor) {
    editor.textarea.on("input", () => {
      clearTimeout(editor.debounceTimer);
      editor.debounceTimer = setTimeout(() => {
        renderPreview(editor);
      }, editor.options.debounceDelay);
    });
  }
  function renderPreview(editor) {
    if (!editor.previewPane) return;
    const markdown = editor.textarea.val();
    if (!markdown.trim()) {
      editor.previewPane.html('<p class="preview-empty">Preview wird hier angezeigt...</p>');
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
            editor.previewPane.html(response.html);
          } else {
            debugLog("Backend preview failed: Invalid response", "ERROR", response);
            fallbackToClientPreview(editor, markdown);
          }
        },
        error: (xhr, status, error) => {
          debugLog("Backend preview failed: " + error, "ERROR", { status, xhr });
          fallbackToClientPreview(editor, markdown);
        }
      });
    } else {
      debugLog("No backend API configured - using client-side preview", "WARN");
      fallbackToClientPreview(editor, markdown);
    }
  }
  function fallbackToClientPreview(editor, markdown) {
    debugLog("Using client-side preview fallback", "DEBUG");
    const html = simpleMarkdownToHtml(markdown);
    editor.previewPane.html(html);
  }
  function simpleMarkdownToHtml(markdown) {
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
  function togglePreview(editor) {
    editor.container.toggleClass("preview-hidden");
  }

  // js/src/format-switcher.js
  function createFormatSwitcherStandalone(editor) {
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
      change: (e) => editor.switchFormat(e.target.value)
    });
    const formats = [
      { value: "markdown", label: "Markdown" },
      { value: "html", label: "HTML" }
    ];
    formats.forEach((format) => {
      $select.append($("<option>", {
        value: format.value,
        text: format.label,
        selected: format.value === editor.currentFormat
      }));
    });
    $wrapper.append($label).append($select);
    editor.textarea.before($wrapper);
    editor.formatSwitcher = $wrapper;
    editor.formatSwitcherSelect = $select;
    debugLog("Created standalone format switcher before textarea", "DEBUG");
  }
  function createFormatSwitcher(editor) {
    const switcher = $("<div>", {
      class: "format-switcher"
    });
    const select = $("<select>", {
      class: "format-switcher-select",
      "aria-label": "Select input format",
      change: (e) => editor.switchFormat(e.target.value)
    });
    const formats = [
      { value: "markdown", label: "Markdown" },
      { value: "html", label: "HTML" }
    ];
    formats.forEach((format) => {
      select.append($("<option>", {
        value: format.value,
        text: format.label,
        selected: format.value === editor.currentFormat
      }));
    });
    switcher.append(select);
    return switcher;
  }
  function ensureFormatField(editor) {
    const textareaName = editor.textarea.attr("name");
    let formatField = editor.textarea.closest("form").find('input[name="format"]');
    if (formatField.length === 0) {
      formatField = editor.textarea.closest("form").find(`input[name="format[${textareaName}]"]`);
    }
    if (formatField.length === 0) {
      formatField = $("<input>", {
        type: "hidden",
        name: "format",
        value: editor.currentFormat
      });
      editor.textarea.after(formatField);
      debugLog(`Created format field with value "${editor.currentFormat}"`, "DEBUG");
    } else {
      formatField.val(editor.currentFormat);
      debugLog(`Updated existing format field to "${editor.currentFormat}"`, "DEBUG");
    }
    editor.formatField = formatField;
  }

  // js/src/redactor-bridge.js
  function destroyRedactor(editor) {
    const $redactorBox = editor.textarea.siblings(".redactor-box");
    debugLog("destroyRedactor() called", "DEBUG");
    debugLog("Found .redactor-box elements:", "DEBUG", $redactorBox.length);
    debugLog("Textarea has .richtext class:", "DEBUG", editor.textarea.hasClass("richtext"));
    debugLog("Redactor data:", "DEBUG", editor.textarea.data("redactor"));
    if (typeof editor.textarea.redactor === "function") {
      try {
        editor.textarea.redactor("core.destroy");
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
      debugLog("Removed Redactor box from DOM (sibling)", "DEBUG");
    } else {
      const $parentRedactorBox = editor.textarea.closest(".redactor-box");
      if ($parentRedactorBox.length > 0) {
        debugLog("Found .redactor-box as PARENT! Moving textarea out and removing box...", "DEBUG");
        editor.textarea.insertBefore($parentRedactorBox);
        $parentRedactorBox.remove();
        debugLog("Moved textarea out of .redactor-box and removed box", "DEBUG");
      } else {
        debugLog("No .redactor-box found (Redactor was not initialized)", "DEBUG");
      }
    }
    editor.textarea.removeData("redactor");
    editor.textarea.removeData("redactor-instance");
    editor.textarea.show().css({
      "display": "block !important",
      "visibility": "visible !important"
    });
    editor.textarea.removeClass("redactor-source redactor-in");
    debugLog("Removed Redactor classes and forced textarea visible", "DEBUG");
    editor.textarea.removeClass("richtext");
    editor.textarea.attr("data-markdown-enabled", "true");
    editor.textarea.addClass("markdown-active");
    setupRedactorProtection(editor);
    setTimeout(() => {
      const $laterRedactorBox = editor.textarea.siblings(".redactor-box");
      if ($laterRedactorBox.length > 0) {
        debugLog("Found .redactor-box as sibling after delay! Removing...", "DEBUG");
        $laterRedactorBox.remove();
        editor.textarea.show().css({
          "display": "block !important",
          "visibility": "visible !important"
        });
        editor.textarea.removeClass("richtext redactor-source redactor-in");
        debugLog("Removed delayed Redactor box (sibling)", "DEBUG");
      }
      const $parentRedactorBox = editor.textarea.closest(".redactor-box");
      if ($parentRedactorBox.length > 0) {
        debugLog("Found .redactor-box as PARENT after delay! Unwrapping...", "DEBUG");
        editor.textarea.unwrap(".redactor-box");
        editor.textarea.show().css({
          "display": "block !important",
          "visibility": "visible !important"
        });
        editor.textarea.removeClass("richtext redactor-source redactor-in");
        debugLog("Unwrapped delayed Redactor box (parent)", "DEBUG");
      }
    }, 300);
    debugLog("Redactor cleanup complete", "DEBUG");
  }
  function restoreRedactor(editor) {
    debugLog("Restoring Redactor for HTML format", "INFO");
    if (editor.redactorObserver) {
      editor.redactorObserver.disconnect();
      editor.redactorObserver = null;
      debugLog("Disconnected MutationObserver (allows Redactor creation)", "DEBUG");
    }
    editor.textarea.removeData("redactor");
    editor.textarea.removeData("redactor-instance");
    editor.textarea.removeAttr("data-redactor");
    editor.textarea.removeAttr("data-redactor-uuid");
    debugLog("Cleared all Redactor data and attributes", "DEBUG");
    const existingRedactorBox = editor.textarea.siblings(".redactor-box");
    const existingRedactorIn = editor.textarea.siblings('[class*="redactor-in"]');
    const existingRedactorStyles = editor.textarea.siblings(".redactor-styles");
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
    if (editor.container && editor.container.length > 0) {
      if (editor.formatSwitcher && editor.formatSwitcher.length > 0) {
        editor.textarea.insertAfter(editor.formatSwitcher);
      } else {
        editor.textarea.insertBefore(editor.container);
      }
      editor.container.hide();
      debugLog("Moved textarea out of markdown container", "DEBUG");
    }
    editor.textarea.removeClass("markdown-textarea markdown-active");
    editor.textarea.removeAttr("data-markdown-enabled");
    editor.textarea.attr("data-wants-redactor", "true");
    editor.textarea.addClass("richtext");
    editor.textarea.parent().removeClass("-redactor-container");
    debugLog("Removed -redactor-container class from parent", "DEBUG");
    editor.textarea.removeAttr("style");
    editor.textarea.show();
    editor.textarea[0].offsetHeight;
    if (typeof $.fn.redact === "function") {
      try {
        const $textarea = editor.textarea;
        const textareaName = $textarea.attr("name");
        setTimeout(() => {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i;
          debugLog("Redactor initialization for:", "DEBUG", textareaName);
          const redactPromise = $.fn.redact($textarea[0]);
          debugLog("Redactor initialization started...", "DEBUG");
          if (redactPromise && typeof redactPromise.then === "function") {
            redactPromise.then(() => {
              debugLog("Redactor Promise resolved for:", "DEBUG", textareaName);
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
                  debugLog("No .redactor-box found after Promise resolved!", "WARNING");
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
                  debugLog("Redactor toolbar successfully created!", "DEBUG");
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
                  toolbar: true,
                  air: false,
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
                  debugLog("Direct Redactor initialization successful!", "DEBUG");
                } else {
                  debugLog("Redactor box not in DOM - attempting manual insertion...", "WARNING");
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
                      debugLog("Manually inserted Redactor box into DOM!", "DEBUG");
                    } else {
                      debugLog("Could not extract DOM node from Redactor container", "ERROR");
                    }
                  } else {
                    debugLog("Could not find Redactor instance or container", "ERROR");
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
  function setupRedactorProtection(editor) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && $(node).hasClass("redactor-box")) {
            debugLog("Detected Redactor re-initialization! Cleaning up...", "DEBUG");
            $(node).remove();
            editor.textarea.show();
            editor.textarea.removeClass("richtext");
            editor.textarea.attr("data-markdown-enabled", "true");
            editor.textarea.removeData("redactor");
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

  // js/src/image-upload.js
  var ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];
  function setupImageUpload(editor) {
    teardownImageUploadHandlers(editor);
    editor.draftId = editor.textarea.attr("data-draft-id") || null;
    editor.draftNamespace = editor.textarea.attr("data-draft-namespace") || null;
    editor.draftObjectId = editor.textarea.attr("data-draft-object-id") || null;
    if (typeof editor.uploadCounter === "undefined") {
      editor.uploadCounter = 0;
    }
    updateUploadUrl(editor);
    if (!editor.uploadUrl) {
      debugLog("No draft namespace found - image upload disabled", "WARNING");
      return;
    }
    editor.textarea.on("paste.markdownImageUpload", (e) => {
      if (editor.currentFormat !== "markdown") return;
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
      imageFiles.forEach((file) => uploadImage(editor, file));
    });
    const $dropZone = editor.container;
    $dropZone.on("dragover.markdownImageUpload", (e) => {
      if (editor.currentFormat !== "markdown") return;
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
      if (editor.currentFormat !== "markdown") return;
      e.preventDefault();
      e.stopPropagation();
      $dropZone.removeClass("markdown-drop-active");
      const files = (_a = e.originalEvent.dataTransfer) == null ? void 0 : _a.files;
      if (!files || files.length === 0) return;
      for (let i = 0; i < files.length; i++) {
        if (ALLOWED_IMAGE_TYPES.includes(files[i].type)) {
          uploadImage(editor, files[i]);
        }
      }
    });
    debugLog("Image upload handlers registered", "DEBUG");
  }
  function teardownImageUploadHandlers(editor) {
    editor.textarea.off("paste.markdownImageUpload");
    if (editor.container) {
      editor.container.off("dragover.markdownImageUpload dragleave.markdownImageUpload drop.markdownImageUpload");
    }
  }
  function updateUploadUrl(editor) {
    let draftPath;
    if (editor.draftId) {
      draftPath = editor.draftId + "/attach";
    } else if (editor.draftNamespace) {
      let ns = editor.draftNamespace;
      if (editor.draftObjectId) {
        ns += "." + editor.draftObjectId;
      }
      draftPath = ns + "/attach";
    } else {
      editor.uploadUrl = null;
      return;
    }
    editor.uploadUrl = "ajax.php/draft/" + draftPath;
  }
  function uploadImage(editor, file) {
    editor.uploadCounter++;
    const uploadId = editor.uploadCounter;
    const placeholder = `![Uploading image-${uploadId}...]()`;
    insertTextAtCursor(editor, placeholder);
    showUploadProgress(editor, uploadId);
    const formData = new FormData();
    formData.append("file[]", file, file.name || "pasted-image.png");
    const csrfToken = $("meta[name=csrf_token]").attr("content") || $('input[name="__CSRFToken__"]').val();
    if (!csrfToken) {
      debugLog("CSRF token not found - upload aborted", "ERROR");
      replacePlaceholder(editor, placeholder, "");
      hideUploadProgress(editor, uploadId);
      showUploadError(editor, "Upload failed: Security token not found. Please reload the page.");
      return;
    }
    formData.append("__CSRFToken__", csrfToken);
    $.ajax({
      url: editor.uploadUrl,
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      dataType: "json",
      global: false,
      success: (response) => {
        handleUploadSuccess(editor, response, placeholder, uploadId);
      },
      error: (xhr) => {
        handleUploadError(editor, xhr, placeholder, uploadId);
      }
    });
  }
  function handleUploadSuccess(editor, response, placeholder, uploadId) {
    hideUploadProgress(editor, uploadId);
    const keys = Object.keys(response);
    if (keys.length === 0) {
      replacePlaceholder(editor, placeholder, "![Upload failed]()");
      return;
    }
    const fileData = response[keys[0]];
    const fileName = keys[0];
    if (fileData.draft_id && !editor.draftId) {
      editor.draftId = fileData.draft_id;
      updateUploadUrl(editor);
      debugLog("Draft ID set to: " + editor.draftId, "DEBUG");
    }
    const rawUrl = fileData.url || "file.php?key=" + String(fileData.id) + "&disposition=inline";
    const imageUrl = /^https?:\/\//.test(rawUrl) || /file\.php\?/.test(rawUrl) ? rawUrl : "#invalid-url";
    const altText = fileName.replace(/\.[^.]+$/, "").replace(/[\[\]()]/g, "");
    const markdown = `![${altText}](${imageUrl})`;
    replacePlaceholder(editor, placeholder, markdown);
    debugLog("Image uploaded successfully: " + fileName, "INFO");
  }
  function handleUploadError(editor, xhr, placeholder, uploadId) {
    hideUploadProgress(editor, uploadId);
    let errorMsg = "Upload failed";
    try {
      const resp = JSON.parse(xhr.responseText);
      if (resp.error) errorMsg = String(resp.error).substring(0, 200);
    } catch (e) {
      if (xhr.responseText) {
        errorMsg = xhr.responseText.replace(/<[^>]*>/g, "").substring(0, 200);
      }
    }
    replacePlaceholder(editor, placeholder, "");
    showUploadError(editor, errorMsg);
    debugLog("Image upload failed: " + errorMsg, "ERROR");
  }
  function showUploadProgress(editor, uploadId) {
    if (!editor.container) return;
    const $indicator = $("<div>", {
      class: "markdown-upload-indicator",
      "data-upload-id": uploadId,
      html: '<span class="markdown-upload-spinner"></span> <span class="markdown-upload-text">Uploading image...</span>'
    });
    editor.container.append($indicator);
  }
  function hideUploadProgress(editor, uploadId) {
    if (!editor.container) return;
    editor.container.find(`.markdown-upload-indicator[data-upload-id="${uploadId}"]`).remove();
  }
  function showUploadError(editor, message) {
    if (!editor.container) return;
    const $error = $("<div>", {
      class: "markdown-upload-error",
      text: message
    });
    editor.container.append($error);
    setTimeout(() => $error.fadeOut(300, () => $error.remove()), 5e3);
  }
  function triggerImageFileDialog(editor) {
    if (!editor.uploadUrl) {
      showUploadError(editor, "Image upload not available \u2014 no draft context found.");
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
        uploadImage(editor, files[i]);
      }
      $input.remove();
    });
    $("body").append($input);
    $input[0].click();
    setTimeout(() => {
      if ($input.parent().length) $input.remove();
    }, 6e4);
  }

  // js/src/canned-response.js
  function htmlToMarkdown(html) {
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
      const lines = stripTags(content).trim().split("\n");
      return "\n\n" + lines.map((l) => "> " + l.trim()).join("\n") + "\n\n";
    });
    md = md.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      let idx = 0;
      const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, li) => {
        idx++;
        return idx + ". " + stripTags(li).trim() + "\n";
      });
      return "\n\n" + items.trim() + "\n\n";
    });
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, li) => {
        return "- " + stripTags(li).trim() + "\n";
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
    md = stripTags(md);
    md = decodeEntities(md);
    md = md.replace(/\n{3,}/g, "\n\n");
    return md.trim();
  }
  function stripTags(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
  function decodeEntities(text) {
    const tmp = document.createElement("textarea");
    tmp.innerHTML = text;
    return tmp.value;
  }
  function setupCannedResponseHandler(editor) {
    const $form = editor.textarea.closest("form");
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
              insertCannedResponse(editor, canned.response);
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
  function insertCannedResponse(editor, htmlContent) {
    if (editor.currentFormat === "markdown" || editor.currentFormat === "text") {
      const markdown = htmlToMarkdown(htmlContent);
      debugLog("Inserting canned response as Markdown", "DEBUG", {
        htmlLength: htmlContent.length,
        mdLength: markdown.length
      });
      insertTextAtCursor(editor, markdown);
    } else {
      const redactor = $R("#response.richtext");
      if (redactor) {
        redactor.api("selection.restore");
        redactor.insertion.insertHtml(htmlContent);
      } else {
        const box = editor.textarea;
        box.val(box.val() + htmlContent);
      }
    }
  }

  // js/src/text-actions.js
  function wrapSelection(editor, prefix, suffix, placeholder = "") {
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
    editor.textarea.trigger("input");
  }
  function insertHeading(editor) {
    const textarea = editor.textarea[0];
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
    editor.textarea.trigger("input");
  }
  function insertLink(editor) {
    const textarea = editor.textarea[0];
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
      editor.textarea.trigger("input");
    }
  }
  function insertCodeBlock(editor) {
    const language = prompt("Programmiersprache (optional):", "javascript") || "";
    wrapSelection(editor, "```" + language + "\n", "\n```", "code here");
  }
  function insertList(editor, type) {
    const textarea = editor.textarea[0];
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
    editor.textarea.trigger("input");
  }
  function insertBlockquote(editor) {
    const textarea = editor.textarea[0];
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);
    const lines = selection ? selection.split("\n") : ["Quote"];
    const quote = lines.map((line) => `> ${line}`).join("\n");
    textarea.value = text.substring(0, start) + quote + text.substring(end);
    const newPos = start + quote.length;
    textarea.setSelectionRange(newPos, newPos);
    editor.textarea.trigger("input");
  }
  function insertHorizontalRule(editor) {
    const textarea = editor.textarea[0];
    const start = textarea.selectionStart;
    const text = textarea.value;
    const hr = "\n\n---\n\n";
    textarea.value = text.substring(0, start) + hr + text.substring(start);
    const newPos = start + hr.length;
    textarea.setSelectionRange(newPos, newPos);
    editor.textarea.trigger("input");
  }
  function setupKeyboardShortcuts(editor) {
    editor.textarea.on("keydown", (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          wrapSelection(editor, "**", "**", "bold text");
          break;
        case "i":
          e.preventDefault();
          wrapSelection(editor, "*", "*", "italic text");
          break;
        case "k":
          e.preventDefault();
          insertLink(editor);
          break;
        case "h":
          e.preventDefault();
          insertHeading(editor);
          break;
      }
    });
  }

  // js/src/core.js
  var MarkdownEditor = class {
    constructor(textarea, options = {}) {
      this.textarea = $(textarea);
      const globalConfig = window.osTicketMarkdownConfig || {};
      debugLog("Global config received", "DEBUG", globalConfig);
      debugLog("Default format from config: " + globalConfig.defaultFormat, "DEBUG");
      this.options = $.extend({
        showToolbar: globalConfig.showToolbar !== void 0 ? globalConfig.showToolbar : true,
        allowFormatSwitch: globalConfig.allowFormatSwitch !== void 0 ? globalConfig.allowFormatSwitch : true,
        previewPosition: "bottom",
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
    // -- Container --
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
    // -- Delegated module methods --
    // Redactor bridge
    destroyRedactor() {
      destroyRedactor(this);
    }
    restoreRedactor() {
      restoreRedactor(this);
    }
    setupRedactorProtection() {
      setupRedactorProtection(this);
    }
    // Toolbar
    createToolbar() {
      createToolbar(this);
    }
    // Preview
    createPreview() {
      createPreview(this);
    }
    setupLivePreview() {
      setupLivePreview(this);
    }
    renderPreview() {
      renderPreview(this);
    }
    togglePreview() {
      togglePreview(this);
    }
    // Format switcher
    createFormatSwitcherStandalone() {
      createFormatSwitcherStandalone(this);
    }
    createFormatSwitcher() {
      return createFormatSwitcher(this);
    }
    ensureFormatField() {
      ensureFormatField(this);
    }
    // Text actions
    wrapSelection(prefix, suffix, placeholder) {
      wrapSelection(this, prefix, suffix, placeholder);
    }
    insertHeading() {
      insertHeading(this);
    }
    insertLink() {
      insertLink(this);
    }
    insertCodeBlock() {
      insertCodeBlock(this);
    }
    insertList(type) {
      insertList(this, type);
    }
    insertBlockquote() {
      insertBlockquote(this);
    }
    insertHorizontalRule() {
      insertHorizontalRule(this);
    }
    setupKeyboardShortcuts() {
      setupKeyboardShortcuts(this);
    }
    // Image upload
    setupImageUpload() {
      setupImageUpload(this);
    }
    _teardownImageUploadHandlers() {
      teardownImageUploadHandlers(this);
    }
    _triggerImageFileDialog() {
      triggerImageFileDialog(this);
    }
    _showUploadError(msg) {
      showUploadError(this, msg);
    }
    // Canned response
    setupCannedResponseHandler() {
      setupCannedResponseHandler(this);
    }
    htmlToMarkdown(html) {
      return htmlToMarkdown(html);
    }
    // -- Format switching (orchestrator) --
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
      this.textarea.removeClass("markdown-textarea markdown-active");
      this.textarea.off("input keydown paste.markdownImageUpload");
      if (this.container) {
        this.container.off("dragover.markdownImageUpload dragleave.markdownImageUpload drop.markdownImageUpload");
      }
      debugLog("Editor destroyed", "DEBUG");
    }
  };

  // js/src/bootstrap.js
  function registerPlugin() {
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
  }
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
  function autoInit() {
    $(document).ready(function() {
      debugLog("Initializing auto-detection...", "DEBUG");
      preventRedactorReInitialization();
      const primarySelectors = [
        'textarea[name="response"]',
        'textarea[name="message"]',
        'textarea[name="note"]',
        "textarea.markdown-enabled",
        'textarea[data-markdown="true"]'
      ];
      const secondarySelectors = [
        "textarea.richtext"
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
        subtree: true
      });
      debugLog("MutationObserver started for dynamic textareas", "INFO");
    });
  }

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
    function initializeMarkdownEditor($2) {
      init($2, false);
      registerPlugin();
      autoInit();
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
