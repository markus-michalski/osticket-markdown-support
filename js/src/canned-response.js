/**
 * Canned response interception for Markdown mode
 *
 * Intercepts osTicket's canned response insertion and converts
 * HTML to Markdown when Markdown mode is active.
 */

import { $ } from './globals.js';
import { debugLog, insertTextAtCursor } from './utils.js';

/**
 * Convert simple HTML to Markdown
 *
 * @param {string} html - HTML string to convert
 * @returns {string} Markdown string
 */
export function htmlToMarkdown(html) {
    if (!html || typeof html !== 'string') return '';

    let md = html;
    md = md.replace(/\r\n/g, '\n');
    md = md.replace(/<!--[\s\S]*?-->/g, '');

    // Headings
    for (let i = 1; i <= 6; i++) {
        const hashes = '#'.repeat(i);
        const re = new RegExp(`<h${i}[^>]*>(.*?)<\\/h${i}>`, 'gi');
        md = md.replace(re, `\n\n${hashes} $1\n\n`);
    }

    // Blockquotes
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
        const lines = stripTags(content).trim().split('\n');
        return '\n\n' + lines.map(l => '> ' + l.trim()).join('\n') + '\n\n';
    });

    md = md.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

    // Ordered lists
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
        let idx = 0;
        const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, li) => {
            idx++;
            return idx + '. ' + stripTags(li).trim() + '\n';
        });
        return '\n\n' + items.trim() + '\n\n';
    });

    // Unordered lists
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
        const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, li) => {
            return '- ' + stripTags(li).trim() + '\n';
        });
        return '\n\n' + items.trim() + '\n\n';
    });

    // Paragraphs and line breaks
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // Images (multiple attribute orders)
    md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*?)["'][^>]*\/?>/gi, '![$2]($1)');
    md = md.replace(/<img[^>]*alt=["']([^"']*?)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![$1]($2)');
    md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![]($1)');

    // Links and inline formatting
    md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
    md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
    md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

    // Code blocks
    md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n\n```\n$1\n```\n\n');
    md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n\n```\n$1\n```\n\n');

    // Clean up
    md = stripTags(md);
    md = decodeEntities(md);
    md = md.replace(/\n{3,}/g, '\n\n');

    return md.trim();
}

/**
 * Strip HTML tags from string
 *
 * @param {string} html
 * @returns {string}
 */
function stripTags(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

/**
 * Decode HTML entities
 *
 * @param {string} text
 * @returns {string}
 */
function decodeEntities(text) {
    const tmp = document.createElement('textarea');
    tmp.innerHTML = text;
    return tmp.value;
}

/**
 * Setup handler to intercept osTicket's canned response insertion
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function setupCannedResponseHandler(editor) {
    const $form = editor.textarea.closest('form');

    setTimeout(() => {
        const $cannedSelect = $form.find('#cannedResp');
        if ($cannedSelect.length === 0) {
            return;
        }

        if ($cannedSelect.data('markdownCannedBound')) {
            return;
        }

        $cannedSelect.data('markdownCannedBound', true);
        $cannedSelect.off('change');

        $cannedSelect.on('change', function() {
            const cid = $(this).val();
            if (!cid || cid === '0') return;

            const tid = $(':input[name=id]', $form).val();
            $(this).find('option:first').attr('selected', 'selected').parent('select');

            let url = 'ajax.php/kb/canned-response/' + cid + '.json';
            if (tid) {
                url = 'ajax.php/tickets/' + tid + '/canned-resp/' + cid + '.json';
            }

            $.ajax({
                type: 'GET',
                url: url,
                dataType: 'json',
                cache: false,
                success: function(canned) {
                    if (canned.response) {
                        insertCannedResponse(editor, canned.response);
                    }

                    const ca = $('.attachments', $form);
                    if (canned.files && ca.length) {
                        const fdb = ca.find('.dropzone').data('dropbox');
                        if (fdb) {
                            $.each(canned.files, function(i, j) {
                                fdb.addNode(j);
                            });
                        }
                    }
                }
            });
        });

        debugLog('Canned response handler initialized', 'DEBUG');
    }, 500);
}

/**
 * Insert canned response content into the active editor
 *
 * @param {object} editor - MarkdownEditor instance
 * @param {string} htmlContent - HTML content from canned response API
 */
function insertCannedResponse(editor, htmlContent) {
    if (editor.currentFormat === 'markdown' || editor.currentFormat === 'text') {
        const markdown = htmlToMarkdown(htmlContent);
        debugLog('Inserting canned response as Markdown', 'DEBUG', {
            htmlLength: htmlContent.length,
            mdLength: markdown.length
        });
        insertTextAtCursor(editor, markdown);
    } else {
        const redactor = $R('#response.richtext');
        if (redactor) {
            redactor.api('selection.restore');
            redactor.insertion.insertHtml(htmlContent);
        } else {
            const box = editor.textarea;
            box.val(box.val() + htmlContent);
        }
    }
}
