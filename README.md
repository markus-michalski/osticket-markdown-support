# Markdown Support Plugin for osTicket

> 📖 **[Complete Documentation & FAQ](https://faq.markus-michalski.net/en/osticket/markdown-support)** - Detailed guides, troubleshooting, API integration, and technical details

## Overview

Adds Markdown formatting support to osTicket 1.18.x ticket threads with a user-friendly editor interface, live preview, and automatic format detection.

Perfect for support teams who prefer Markdown's simplicity over HTML WYSIWYG editors, especially for technical documentation, code snippets, and API integrations.

## Key Features

- ✅ **Markdown Editor with Toolbar** - 10+ formatting buttons (Bold, Italic, Headings, Links, Code, Lists, Quotes)
- ✅ **Live Preview** - Real-time rendering while typing
- ✅ **Keyboard Shortcuts** - Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+K (Link), Ctrl+H (Heading)
- ✅ **Format Switcher** - Switch between Text, HTML, and Markdown formats
- ✅ **Auto-Detection** - Automatically detects Markdown syntax in API-created tickets
- ✅ **Mobile-Responsive** - Optimized for desktop and mobile devices
- ✅ **Dark Mode Support** - Automatic theme detection
- ✅ **XSS Protection** - 2-layer security (Parsedown SafeMode + Format::sanitize)
- ✅ **No Core Modifications** - Uses reflection-based extension (update-safe)

## Use Cases

- **Technical Support Teams** - Use Markdown for code blocks and syntax highlighting
- **Internal Notes** - Fast formatting without WYSIWYG complexity
- **API Integrations** - Auto-detect Markdown in API-created tickets
- **Documentation** - Create structured responses with headings and lists
- **Copy-Paste from GitHub** - Markdown content pastes seamlessly

## Requirements

- osTicket **1.18.x**
- PHP **7.4+** (recommended: PHP 8.1+)
- jQuery (included in osTicket)

## Installation

### Step 1: Install Plugin Files

#### Method 1: ZIP Download (Recommended)

1. Download the latest release ZIP from [Releases](https://github.com/markus-michalski/osticket-plugins/releases)
2. Extract the ZIP file
3. Upload the `markdown-support` folder to `/include/plugins/` on your osTicket server

#### Method 2: Git Repository

```bash
cd /path/to/osticket/include/plugins
git clone https://github.com/markus-michalski/osticket-plugins.git
# Plugin will be in: osticket-plugins/markdown-support/
```

### Step 2: Enable Plugin in osTicket

1. Login to osTicket Admin Panel
2. Navigate to: **Admin Panel → Manage → Plugins**
3. Find **"Markdown Support"** in the list
4. Click **"Enable"**

The plugin will automatically configure static asset access (`.htaccess` update).

### Step 3: Configure Plugin (Optional)

1. Click **"Configure"** next to "Markdown Support"
2. Adjust settings:
   - ✅ **Enable Markdown Support** - Enable/disable Markdown globally
   - 📝 **Default Format** - Set default format for new entries (Text/HTML/Markdown)
   - 🔄 **Allow Format Switching** - Let users switch between formats
   - 🤖 **Auto-Convert Markdown Syntax** - Automatically detect Markdown patterns in API tickets
   - 👁️ **Show Live Preview** - Enable/disable live preview pane
   - 🛠️ **Show Toolbar** - Show/hide formatting toolbar

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| Enable Markdown Support | Globally enable/disable Markdown formatting | ✅ On |
| Default Thread Entry Format | Default format for new entries | Markdown |
| Allow Format Switching | Users can switch between Text/HTML/Markdown | ✅ On |
| Auto-Convert Markdown Syntax | Automatically detect Markdown patterns | ❌ Off |
| Show Live Preview | Display real-time preview pane | ✅ On |
| Show Markdown Toolbar | Show formatting buttons | ✅ On |

**Tip:** Enable "Auto-Convert Markdown Syntax" if you create tickets via API with Markdown content but no explicit format parameter.

## Usage

### Toolbar Buttons

| Button | Markdown | Shortcut | Description |
|--------|----------|----------|-------------|
| **B** | `**text**` | Ctrl+B | Bold text |
| *I* | `*text*` | Ctrl+I | Italic text |
| H | `## text` | Ctrl+H | Heading (cycles H1-H6) |
| 🔗 | `[text](url)` | Ctrl+K | Insert link |
| `<>` | `` `code` `` | - | Inline code |
| `{ }` | ` ```lang ` | - | Code block |
| • | `- item` | - | Unordered list |
| 1. | `1. item` | - | Ordered list |
| " | `> quote` | - | Blockquote |
| — | `---` | - | Horizontal rule |

### Live Preview

The live preview pane shows real-time rendering of your Markdown content. Updates automatically with 500ms debouncing for optimal performance.

- **Desktop**: Side-by-side editor and preview
- **Mobile**: Stacked layout with toggle button

## Troubleshooting

### Plugin not visible in Admin Panel

Check file permissions:
```bash
chmod 755 /path/to/osticket/include/plugins/markdown-support
chmod 644 /path/to/osticket/include/plugins/markdown-support/*.php
```

### JavaScript/CSS not loading

The plugin should automatically update `/include/.htaccess`. If assets don't load:

1. Re-enable the plugin (Disable → Enable)
2. Manually check `/include/.htaccess` contains:
   ```apache
   <FilesMatch "\.(js|css|map|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|otf)$">
       Allow from all
   </FilesMatch>
   ```

### Markdown not rendering

Check error log:
```bash
tail -f /path/to/osticket/include/ost-errors.log
```

Common issues:
- `Parsedown.php not found` → Re-download plugin from releases
- `ThreadEntryBody class not found` → osTicket version mismatch (requires 1.18.x)

### Editor not appearing on "New Ticket" form

The plugin uses a MutationObserver to detect dynamically loaded textareas. If the editor doesn't appear:

1. Check browser console for JavaScript errors
2. Verify assets are loading (Network tab should show 200 OK for CSS/JS)
3. Hard refresh the page (Ctrl+Shift+R)

## 📄 License

This Plugin is released under the GNU General Public License v2, compatible with osTicket core.

See [LICENSE](./LICENSE) for details.

## 💬 Support

**📖 Full Documentation:** https://faq.markus-michalski.net/en/osticket/markdown-support

For questions or issues, please create an issue on GitHub:
https://github.com/markus-michalski/osticket-markdown-support/issues

## 🤝 Contributing

Developed by [Markus Michalski](https://github.com/markus-michalski)

Inspired by the osTicket community's need for better Markdown support in ticket threads.

## ☕ Support Development

This plugin is completely free and open source. If it saves you time or makes your work easier, I'd appreciate a small donation to keep me caffeinated while developing and maintaining this plugin!

[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://paypal.me/tondiar)

Your support helps me continue improving this and other osTicket plugins. Thank you! 🙏

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.
