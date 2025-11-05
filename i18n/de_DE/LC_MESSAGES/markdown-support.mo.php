<?php
/**
 * German (de_DE) Translation for Markdown Support Plugin
 *
 * @package Markdown Support
 * @language German
 */

return array (
  '' => 'Project-Id-Version: markdown-support
Language: de_DE
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit
Plural-Forms: nplurals=2; plural=(n != 1);
',

  // Main configuration
  'Enable Markdown Support' => 'Markdown-Unterstützung aktivieren',
  'When enabled, Markdown formatting will be available for ticket threads. This adds the "markdown" type to ThreadEntryBody and enables Markdown-to-HTML rendering.' => 'Wenn aktiviert, steht Markdown-Formatierung für Ticket-Threads zur Verfügung. Dies fügt den Typ "markdown" zu ThreadEntryBody hinzu und aktiviert die Markdown-zu-HTML-Darstellung.',

  // Default format
  'Default Thread Entry Format' => 'Standard-Thread-Eintragsformat',
  'Default format for new thread entries when replying to tickets. Users can still switch formats using the editor toolbar.' => 'Standardformat für neue Thread-Einträge beim Antworten auf Tickets. Benutzer können das Format weiterhin über die Editor-Symbolleiste wechseln.',
  'Plain Text' => 'Nur Text',
  'HTML' => 'HTML',
  'Markdown' => 'Markdown',

  // Format switching
  'Allow Format Switching' => 'Format-Wechsel erlauben',
  'Allow users to switch between Text, HTML, and Markdown formats in the editor toolbar. If disabled, only the default format will be available.' => 'Erlaubt Benutzern, zwischen Text-, HTML- und Markdown-Formaten in der Editor-Symbolleiste zu wechseln. Wenn deaktiviert, ist nur das Standardformat verfügbar.',

  // Auto-convert
  'Auto-Convert Markdown Syntax' => 'Markdown-Syntax automatisch konvertieren',
  'Automatically detect and convert Markdown syntax (e.g., # Heading, **bold**) to Markdown format when creating thread entries. This helps ensure proper rendering even if user forgets to select Markdown format.' => 'Markdown-Syntax automatisch erkennen und konvertieren (z.B. # Überschrift, **fett**) beim Erstellen von Thread-Einträgen. Dies stellt sicher, dass die Darstellung korrekt ist, auch wenn der Benutzer vergisst, das Markdown-Format auszuwählen.',

  // Live preview
  'Show Live Preview' => 'Live-Vorschau anzeigen',
  'Show a live preview of rendered Markdown while typing in the editor. This helps users see how their Markdown will look before submitting.' => 'Zeigt eine Live-Vorschau des gerenderten Markdowns während der Eingabe im Editor an. Dies hilft Benutzern zu sehen, wie ihr Markdown aussehen wird, bevor sie es absenden.',

  // Toolbar
  'Show Markdown Toolbar' => 'Markdown-Symbolleiste anzeigen',
  'Show a toolbar with Markdown formatting buttons (bold, italic, links, etc.) above the editor. This makes it easier for users who are not familiar with Markdown syntax.' => 'Zeigt eine Symbolleiste mit Markdown-Formatierungsschaltflächen (fett, kursiv, Links, etc.) über dem Editor an. Dies erleichtert Benutzern, die nicht mit der Markdown-Syntax vertraut sind, die Nutzung.',

  // Version tracking
  'Installed Version' => 'Installierte Version',
  'Currently installed version (automatically updated)' => 'Aktuell installierte Version (wird automatisch aktualisiert)',

  // Error messages
  'Auto-convert requires Markdown Support to be enabled' => 'Automatische Konvertierung erfordert, dass Markdown-Unterstützung aktiviert ist',
);
