# Changelog - markdown-support

All notable changes to this plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

## [1.0.4] - 2025-10-22

### Added
- Auto-deploy API file to /api/ to avoid .htaccess conflicts

### Fixed
- Deploy API file on enable and update, not just bootstrap
- Support Parsedown path when API is deployed to /api/
- Remove API file on plugin disable/uninstall
- Force dark text color in markdown textarea
- Add explicit access grant for markdown-preview.php
## [1.0.3] - 2025-10-22

### Changed
- added correct version for release
- doc: fixed changelog for release
- added missing .htaccess to .releaseinclude
- Remove DEBUG_SAVE.txt file logging from config

### Fixed
- Define sanitize function at top of file to prevent undefined error
- Allow PHP API endpoints in plugin directories via .htaccess
- Skip output buffering on AJAX requests to prevent lock issues
- Error handler should only catch fatal errors, not notices
- Add error handling and rename sanitize function in preview API
- Remove verbose info logs and fix dropdown text color
## [1.0.2] - 2025-10-22

### Changed
- Remove verbose info logs from plugin bootstrap
## [1.0.1] - 2025-10-22

### Added
- Switch to .releaseinclude (whitelist mode)
- Integrate Markdown support for ticket creation (complete)
- Add TicketFormatHandler for format selection during ticket creation
- Add MarkdownDetector for auto-detection of Markdown syntax
- Implement Backend Markdown Preview API
- Add optional debug logging system to file
- Respect all config options in frontend
- Change default preview position from side to bottom
- Add German (de_DE) translation for plugin configuration
- Add .releaseignore for release packaging
- Complete Markdown Support Plugin (Phase 1-3)
- Add complete Markdown editor with live preview
- Implement Phase 1 Core Backend

### Changed
- Remove verbose info logs from plugin bootstrap
- Reset all plugins to v0.9.0 for first official release
- doc: removed unnecessary files
- Refactor READMEs following osTicket-Pro standards
- Document ticket creation and auto-detection features
- Add comprehensive tests for Preview API (TDD nachgeholt)
- Simplify WYSIWYG label in config
- Remove all console output from debugLog()
- Replace 92 console.log/error/warn with debugLog()
- Remove show_preview option - Preview always enabled
- Remove "Plain Text" format, keep only Markdown and HTML
- debug: Log toolbar and container elements
- debug: Force Redactor to non-inline mode and log config
- debug: Add detailed state logging before Redactor init
- debug: Add detailed logging for Redactor initialization
- revert: Rollback getInstance() fix - broke everything
- debug(markdown-support): Add comprehensive save process logging
- debug(markdown-support): Add full config dump and instance info
- debug(markdown-support): Write config to DEBUG_CONFIG.txt for inspection
- debug(markdown-support): Add detailed config reading debug logs
- debug(markdown-support): Add extensive logging to trace why onObjectView() doesn't fire
- Revert "fix(markdown-support): Move asset injection back to bootstrap()"
- debug(markdown-support): Add extensive logging for default_format issue
- debug(markdown-support): Add debugging logs and delayed Redactor check
- Remove CSS hacks and periodic polling
- revert: Rollback assets.ready Signal (funktioniert nicht)
- revert: Rollback fehlerhafter CSS-Fix für Editor-Flash
- changed testing documentation
- Add comprehensive testing documentation
- Add comprehensive roadmap for future features
- Remove debug logging from newline-restore fix
- doc: added Support Development to Readme's
- removed unnecessary exclutions from .releaseignore of markdown plugin
- Clarify that vendor/ must be included in releases
- Standardize README.md structure and add LICENSE files

### Fixed
- Fix PHP fatal error and add dynamic textarea detection
- Inject Markdown editor assets on New Ticket form
- Prevent function redeclaration in tests
- used correct wording for dropdowns
- Handle non-array context in log-handler to prevent 500 errors
- Handle circular references in debugLog() context serialization
- Remove config injection console.log from PHP
- Simplify log-handler.php - remove osTicket dependencies
- Add debug log calls to test logging system
- Extract DOM node from Redactor container before jQuery wrap
- Manually insert Redactor container into DOM
- Clear ALL Redactor data and remove inline editor DIVs
- Remove -redactor-container class that blocks WYSIWYG mode
- Fix scope issue in Redactor initialization
- Prevent Protection from blocking our own Redactor init
- Add direct Redactor fallback when osTicket wrapper fails
- Wait for Redactor Promise and add fallback initialization
- Critical Redactor initialization bugs (debugger-agent analysis)
- Multiple preview headers, markdown attributes, and textarea sizing
- Dropdown padding and Redactor textarea dimensions
- Correct initialization order and container logic
- Format switcher placement and Redactor restoration
- Dynamic toolbar/preview creation in switchFormat()
- Make format switcher standalone to fix HTML toolbar
- Add null checks for toolbar and preview in switchFormat()
- Remove debug code and fix variable ordering
- Use static config cache instead of getInstance()
- Use correct plugin instance in Signal callbacks
- Move asset injection back to bootstrap()
- Improve pre_save validation with fallbacks
- Replace .unwrap() with .insertBefore() + .remove()
- Search for .redactor-box as parent + force-visible
- Aggressive Redactor-hiding strategy
- Move asset loading back to object.view (jQuery dependency)
- Replace fixed timeout with intelligent polling
- Load assets directly in bootstrap()
- Load assets early via assets.ready signal
- Eliminate editor flash on page load
- Use new values in pre_save validation
- Update author and repository URL
- Multiple critical fixes for production use
- Automatically restore newlines lost during thread entry save
- Remove non-existent reload() call causing Fatal Error
- Add minimal core-file patching to support Markdown rendering
- Set format field to 'markdown' to ensure proper rendering
- Prevent Redactor re-initialization after AJAX requests
- Resolve textarea not clickable issue caused by Redactor conflict
- Correct toolbar position and layout structure
- Correct pre_save() method signature to match PluginConfig parent class
## [1.0.0] - 2025-10-22

### Added
- Switch to .releaseinclude (whitelist mode)
- Integrate Markdown support for ticket creation (complete)
- Add TicketFormatHandler for format selection during ticket creation
- Add MarkdownDetector for auto-detection of Markdown syntax
- Implement Backend Markdown Preview API
- Add optional debug logging system to file
- Respect all config options in frontend
- Change default preview position from side to bottom
- Add German (de_DE) translation for plugin configuration
- Add .releaseignore for release packaging
- Complete Markdown Support Plugin (Phase 1-3)
- Add complete Markdown editor with live preview
- Implement Phase 1 Core Backend

### Changed
- Reset all plugins to v0.9.0 for first official release
- doc: removed unnecessary files
- Refactor READMEs following osTicket-Pro standards
- Document ticket creation and auto-detection features
- Add comprehensive tests for Preview API (TDD nachgeholt)
- Simplify WYSIWYG label in config
- Remove all console output from debugLog()
- Replace 92 console.log/error/warn with debugLog()
- Remove show_preview option - Preview always enabled
- Remove "Plain Text" format, keep only Markdown and HTML
- debug: Log toolbar and container elements
- debug: Force Redactor to non-inline mode and log config
- debug: Add detailed state logging before Redactor init
- debug: Add detailed logging for Redactor initialization
- revert: Rollback getInstance() fix - broke everything
- debug(markdown-support): Add comprehensive save process logging
- debug(markdown-support): Add full config dump and instance info
- debug(markdown-support): Write config to DEBUG_CONFIG.txt for inspection
- debug(markdown-support): Add detailed config reading debug logs
- debug(markdown-support): Add extensive logging to trace why onObjectView() doesn't fire
- Revert "fix(markdown-support): Move asset injection back to bootstrap()"
- debug(markdown-support): Add extensive logging for default_format issue
- debug(markdown-support): Add debugging logs and delayed Redactor check
- Remove CSS hacks and periodic polling
- revert: Rollback assets.ready Signal (funktioniert nicht)
- revert: Rollback fehlerhafter CSS-Fix für Editor-Flash
- changed testing documentation
- Add comprehensive testing documentation
- Add comprehensive roadmap for future features
- Remove debug logging from newline-restore fix
- doc: added Support Development to Readme's
- removed unnecessary exclutions from .releaseignore of markdown plugin
- Clarify that vendor/ must be included in releases
- Standardize README.md structure and add LICENSE files

### Fixed
- Fix PHP fatal error and add dynamic textarea detection
- Inject Markdown editor assets on New Ticket form
- Prevent function redeclaration in tests
- used correct wording for dropdowns
- Handle non-array context in log-handler to prevent 500 errors
- Handle circular references in debugLog() context serialization
- Remove config injection console.log from PHP
- Simplify log-handler.php - remove osTicket dependencies
- Add debug log calls to test logging system
- Extract DOM node from Redactor container before jQuery wrap
- Manually insert Redactor container into DOM
- Clear ALL Redactor data and remove inline editor DIVs
- Remove -redactor-container class that blocks WYSIWYG mode
- Fix scope issue in Redactor initialization
- Prevent Protection from blocking our own Redactor init
- Add direct Redactor fallback when osTicket wrapper fails
- Wait for Redactor Promise and add fallback initialization
- Critical Redactor initialization bugs (debugger-agent analysis)
- Multiple preview headers, markdown attributes, and textarea sizing
- Dropdown padding and Redactor textarea dimensions
- Correct initialization order and container logic
- Format switcher placement and Redactor restoration
- Dynamic toolbar/preview creation in switchFormat()
- Make format switcher standalone to fix HTML toolbar
- Add null checks for toolbar and preview in switchFormat()
- Remove debug code and fix variable ordering
- Use static config cache instead of getInstance()
- Use correct plugin instance in Signal callbacks
- Move asset injection back to bootstrap()
- Improve pre_save validation with fallbacks
- Replace .unwrap() with .insertBefore() + .remove()
- Search for .redactor-box as parent + force-visible
- Aggressive Redactor-hiding strategy
- Move asset loading back to object.view (jQuery dependency)
- Replace fixed timeout with intelligent polling
- Load assets directly in bootstrap()
- Load assets early via assets.ready signal
- Eliminate editor flash on page load
- Use new values in pre_save validation
- Update author and repository URL
- Multiple critical fixes for production use
- Automatically restore newlines lost during thread entry save
- Remove non-existent reload() call causing Fatal Error
- Add minimal core-file patching to support Markdown rendering
- Set format field to 'markdown' to ensure proper rendering
- Prevent Redactor re-initialization after AJAX requests
- Resolve textarea not clickable issue caused by Redactor conflict
- Correct toolbar position and layout structure
- Correct pre_save() method signature to match PluginConfig parent class
