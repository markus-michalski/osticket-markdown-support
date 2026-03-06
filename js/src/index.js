/**
 * Markdown Editor Integration for osTicket
 *
 * Entry point - bundles all modules into a single IIFE via esbuild.
 *
 * @version 2.2.0
 * @author Markdown-Support Plugin
 */

import { init as initGlobals } from './globals.js';
import { MarkdownEditor } from './core.js';
import { registerPlugin, autoInit } from './bootstrap.js';

(function() {
    'use strict';

    /**
     * Wait for jQuery to be available before initializing
     */
    function initWhenReady() {
        if (typeof jQuery === 'undefined') {
            setTimeout(initWhenReady, 50);
            return;
        }

        initializeMarkdownEditor(jQuery);
    }

    /**
     * Main initialization function (runs when jQuery is available)
     */
    function initializeMarkdownEditor($) {
        initGlobals($, false);
        registerPlugin();
        autoInit();
        window.MarkdownEditor = MarkdownEditor;
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        initWhenReady();
    }
})();
