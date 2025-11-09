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

## [1.0.3] - 2025-11-09

### Fixed
- Disable debug logging in production

## [1.0.2] - 2025-11-09

### Fixed
- Resolve CI test failures

## [1.0.1] - 2025-11-09

### Changed
- added zip files to .gitignore
- Reset to v1.0.0 after deleting v1.0.1 and v1.0.2
- Revert to v1.0.1 after deleting v1.0.2 release
- remove server-side debug logging functionality
- Revert version bump to 1.0.0 for automated release process

### Fixed
- Exclude dev dependencies from release ZIP
- Use Composer autoload instead of direct Parsedown.php require
- allow direct access to log-handler.php via htaccess
- Implement robust jQuery dependency loading with active polling
- Resolve jQuery dependency loading issue with defer attribute

## [1.0.0] - 2025-11-06

### Changed
- Add FAQ page reference to README
- Add GitHub Actions workflow for PHP testing
- Reset CHANGELOG for fresh 1.0.0 release
- Initial repository setup for Markdown Support Plugin

### Fixed
- Downgrade doctrine/instantiator to 1.x for PHP 7.4/8.0 support
- Remove direct Parsedown require from test file
- Downgrade to PHPUnit 9.x for PHP 7.4+ compatibility
- Only run Composer/PHPUnit tests on PHP 8.1+
