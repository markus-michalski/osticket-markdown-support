# Contributing to Markdown Support Plugin

## Development Setup

```bash
git clone https://github.com/markus-michalski/osticket-markdown-support.git
cd osticket-markdown-support
composer install
```

## Requirements

- PHP 7.4+ (recommended: 8.1+)
- osTicket 1.18.x (for integration testing)
- Composer

## Code Style

- **Language:** PHP, JavaScript, CSS
- **PHP Standard:** PSR-12
- **Comments:** English
- **Testing:** PHPUnit 9

## Architecture

Reflection-based plugin extension — no core modifications required:

```
plugin.php                      # Plugin metadata
class.MarkdownPlugin.php        # Main plugin class
config.php                      # Configuration form
assets/
  markdown-editor.js            # Editor with toolbar and shortcuts
  markdown-editor.css           # Styling (incl. dark mode)
views/                          # Template overrides
```

### Key Design Decisions

- XSS protection via Parsedown SafeMode + Format::sanitize (2-layer security)
- Auto-detection of Markdown syntax in API-created tickets
- PJAX-compatible JavaScript for dynamic navigation

## Testing

```bash
# Run all tests
./vendor/bin/phpunit

# Run specific test file
./vendor/bin/phpunit tests/Unit/SomeTest.php
```

## CI

GitHub Actions on push/PR to main.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: correct a bug
docs: update documentation
refactor: restructure code
test: add or modify tests
```

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass
4. Open a PR with a clear description

## License

GPL-2.0, compatible with osTicket core.
