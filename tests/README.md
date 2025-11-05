# Markdown Support Plugin - Test Suite

Vollständige Test-Suite für das osTicket Markdown Support Plugin mit Fokus auf **Security**, **Rendering** und **Integration**.

## 📊 Test Coverage

- **101 Tests** insgesamt
- **296 Assertions**
- **3 Test-Suiten:**
  - ✅ **Security Tests** (20 Tests) - XSS Prevention
  - ✅ **Unit Tests** (57 Tests) - Markdown Rendering + Edge Cases
  - ✅ **Integration Tests** (24 Tests) - Plugin Lifecycle

## 🚀 Schnellstart

### Installation

```bash
composer install
```

### Alle Tests ausführen

```bash
composer test
```

### Test-Suites einzeln ausführen

```bash
# Security Tests (HÖCHSTE PRIORITÄT!)
composer test:security

# Unit Tests (Rendering + Edge Cases)
composer test:unit

# Integration Tests (Plugin Bootstrap)
composer test:integration
```

## 🔒 Security Tests (Critical!)

Die **Security-Tests** sind die kritischsten Tests und prüfen die **2-Layer XSS Prevention**:

1. **Layer 1:** Parsedown SafeMode (escaped inline HTML)
2. **Layer 2:** Format::sanitize() (entfernt javascript: URLs)

### Getestete XSS-Vektoren

- ✅ Inline `<script>` tags
- ✅ `<img src=x onerror=alert(1)>`
- ✅ `[Link](javascript:alert(1))`
- ✅ URL-encoded JavaScript (`java%09script:`)
- ✅ Event handlers (`onclick`, `onerror`, `onload`)
- ✅ Data URIs (`data:text/html;base64,...`)
- ✅ SVG-based XSS
- ✅ Case variations (`JavaScript:`, `JAVASCRIPT:`)
- ✅ `<iframe>`, `<object>`, `<embed>`, `<applet>` tags
- ✅ `<meta>`, `<link>`, `<form>`, `<style>` tags
- ✅ HTML entity-encoded XSS
- ✅ Base64-encoded data URIs
- ✅ Mixed Markdown + HTML XSS
- ✅ Nested XSS attempts

**Alle 20 Security-Tests müssen GRÜN sein!**

```bash
composer test:security
```

## 📝 Unit Tests

### Markdown Rendering Tests (30 Tests)

Prüft alle Standard-Markdown-Features:

- Inline Formatting (Bold, Italic, Strikethrough, Code)
- Headings (H1-H6)
- Links (Inline, Reference, Autolinks)
- Lists (Ordered, Unordered, Nested)
- Code Blocks (Fenced, Indented, Language-tagged)
- Blockquotes (Simple, Nested)
- Images
- Horizontal Rules
- Line Breaks
- HTML Entities
- Real-World Ticket Response Example

### Edge Cases Tests (27 Tests)

Prüft Robustheit und Error Handling:

- Empty/NULL Input
- Whitespace-only Input
- Very Long Content (10,000 Zeilen) - Performance
- Deep Nesting (50 Ebenen) - Stack Overflow Prevention
- UTF-8 Multibyte Characters (Emojis, Chinese, German)
- Invalid UTF-8 (Graceful Handling)
- Output Modes (`html`, `email`, `pdf`)
- Method Tests (`toHtml()`, `getSearchable()`, `isEmpty()`)
- Malformed Markdown
- Mixed Line Endings
- Binary Data

## 🔧 Integration Tests (24 Tests)

Prüft Plugin-Lifecycle und Bootstrap-Prozess:

- Plugin ist Singleton
- Reflection-based Extension (ThreadEntryBody::$types += 'markdown')
- Signal Handlers (object.view, threadentry.created)
- Plugin Lifecycle (enable, disable, bootstrap)
- Asset Injection (CSS, JavaScript)
- Configuration Management
- Version Checking
- Multiple Bootstrap Calls (Idempotent)

## 🧪 Test-Framework

- **PHPUnit 10.5**
- **Mockery 1.6** (für Mocks)
- **osTicket Mocks** (keine echte osTicket-Installation nötig!)

### Mock-Klassen

Die Test-Suite verwendet Mocks für alle osTicket-Abhängigkeiten:

- `Plugin` - Base Plugin Class
- `PluginConfig` - Configuration Management
- `ThreadEntryBody` - Base Body Class
- `Format` - HTML Sanitization
- `Signal` - Event System
- `Ticket` - Ticket Object
- Form Fields (`BooleanField`, `ChoiceField`, `TextboxField`)

**Vorteil:** Tests laufen **OHNE** osTicket-Installation!

## 📂 Test-Struktur

```
tests/
├── bootstrap.php                       # Test Bootstrap
├── Mocks/
│   └── OsTicketMocks.php              # osTicket Mock Classes
├── Unit/
│   ├── Security/
│   │   └── XSSPreventionTest.php      # 20 Security Tests
│   ├── MarkdownRenderingTest.php      # 30 Rendering Tests
│   └── EdgeCasesTest.php              # 27 Edge Case Tests
└── Integration/
    └── PluginBootstrapTest.php        # 24 Integration Tests
```

## 🎯 Code Coverage

Coverage-Report generieren:

```bash
# HTML-Report (coverage/ Verzeichnis)
composer test:coverage

# Text-Report (Terminal)
composer test:coverage-text
```

**Ziel:** >90% Code Coverage

## 🚨 CI/CD Integration

Die Test-Suite ist für **GitHub Actions** optimiert:

```bash
# .github/workflows/ci.yml ist konfiguriert
# Tests laufen automatisch bei Push/PR auf main/develop
```

**Matrix Testing:**
- PHP 8.1
- PHP 8.2
- PHP 8.3

## 🛡️ Best Practices

### Security Testing

1. **Immer Security-Tests zuerst laufen lassen**
2. **Alle XSS-Vektoren müssen geblockt sein**
3. **Neue XSS-Vektoren IMMER als Test hinzufügen**

### Unit Testing

1. **Test-First-Ansatz** (TDD)
2. **Jeder Bugfix braucht einen Regression-Test**
3. **Edge Cases dokumentieren**

### Integration Testing

1. **Plugin-Lifecycle vollständig testen**
2. **Signal-Handler prüfen**
3. **Mock-Isolation sicherstellen**

## 🐛 Debugging

Tests mit detaillierten Fehlermeldungen:

```bash
# Verbose-Modus
vendor/bin/phpunit --verbose

# Stop bei erstem Fehler
vendor/bin/phpunit --stop-on-failure

# Nur bestimmte Test-Klasse
vendor/bin/phpunit tests/Unit/Security/XSSPreventionTest.php

# Nur bestimmte Test-Methode
vendor/bin/phpunit --filter testParsedownEscapesInlineScriptTags
```

## 📊 Test-Metriken

```
Security Tests:    20 Tests   84 Assertions   ✅ 100% Pass
Unit Tests:        57 Tests  172 Assertions   ✅ 100% Pass
Integration Tests: 24 Tests   40 Assertions   ✅ 100% Pass
─────────────────────────────────────────────────────────
TOTAL:            101 Tests  296 Assertions   ✅ 100% Pass
```

**Execution Time:** < 1 Sekunde (sehr schnell!)

## 🔗 Dokumentation

- [PHPUnit Documentation](https://phpunit.de/documentation.html)
- [Mockery Documentation](https://docs.mockery.io/)
- [Parsedown Documentation](https://parsedown.org/)

## 📝 Changelog

### v1.0.0 (2025-10-20)

- ✅ Initial Test Suite erstellt
- ✅ 20 Security Tests (XSS Prevention)
- ✅ 30 Markdown Rendering Tests
- ✅ 27 Edge Case Tests
- ✅ 24 Integration Tests
- ✅ GitHub Actions CI/CD Setup
- ✅ Code Coverage Integration
