/**
 * Image upload via paste, drag-and-drop, and file dialog
 *
 * Uses osTicket's draft attachment API for uploads.
 */

import { $ } from './globals.js';
import { debugLog, insertTextAtCursor, replacePlaceholder } from './utils.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

/**
 * Setup image paste and drag-and-drop upload handlers
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function setupImageUpload(editor) {
    teardownImageUploadHandlers(editor);

    editor.draftId = editor.textarea.attr('data-draft-id') || null;
    editor.draftNamespace = editor.textarea.attr('data-draft-namespace') || null;
    editor.draftObjectId = editor.textarea.attr('data-draft-object-id') || null;

    if (typeof editor.uploadCounter === 'undefined') {
        editor.uploadCounter = 0;
    }

    updateUploadUrl(editor);

    if (!editor.uploadUrl) {
        debugLog('No draft namespace found - image upload disabled', 'WARNING');
        return;
    }

    // Paste handler
    editor.textarea.on('paste.markdownImageUpload', (e) => {
        if (editor.currentFormat !== 'markdown') return;
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
        imageFiles.forEach(file => uploadImage(editor, file));
    });

    // Drag-and-drop handlers
    const $dropZone = editor.container;

    $dropZone.on('dragover.markdownImageUpload', (e) => {
        if (editor.currentFormat !== 'markdown') return;
        e.preventDefault();
        e.stopPropagation();
        $dropZone.addClass('markdown-drop-active');
    });

    $dropZone.on('dragleave.markdownImageUpload', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!$.contains($dropZone[0], e.relatedTarget)) {
            $dropZone.removeClass('markdown-drop-active');
        }
    });

    $dropZone.on('drop.markdownImageUpload', (e) => {
        if (editor.currentFormat !== 'markdown') return;
        e.preventDefault();
        e.stopPropagation();
        $dropZone.removeClass('markdown-drop-active');

        const files = e.originalEvent.dataTransfer?.files;
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            if (ALLOWED_IMAGE_TYPES.includes(files[i].type)) {
                uploadImage(editor, files[i]);
            }
        }
    });

    debugLog('Image upload handlers registered', 'DEBUG');
}

/**
 * Remove image upload event handlers
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function teardownImageUploadHandlers(editor) {
    editor.textarea.off('paste.markdownImageUpload');
    if (editor.container) {
        editor.container.off('dragover.markdownImageUpload dragleave.markdownImageUpload drop.markdownImageUpload');
    }
}

/**
 * Build or update the upload URL based on current draft state
 *
 * @param {object} editor - MarkdownEditor instance
 */
function updateUploadUrl(editor) {
    let draftPath;

    if (editor.draftId) {
        draftPath = editor.draftId + '/attach';
    } else if (editor.draftNamespace) {
        let ns = editor.draftNamespace;
        if (editor.draftObjectId) {
            ns += '.' + editor.draftObjectId;
        }
        draftPath = ns + '/attach';
    } else {
        editor.uploadUrl = null;
        return;
    }

    editor.uploadUrl = 'ajax.php/draft/' + draftPath;
}

/**
 * Upload a single image file
 *
 * @param {object} editor - MarkdownEditor instance
 * @param {File} file - The image file to upload
 */
function uploadImage(editor, file) {
    editor.uploadCounter++;
    const uploadId = editor.uploadCounter;
    const placeholder = `![Uploading image-${uploadId}...]()`;

    insertTextAtCursor(editor, placeholder);
    showUploadProgress(editor, uploadId);

    const formData = new FormData();
    formData.append('file[]', file, file.name || 'pasted-image.png');

    const csrfToken = $('meta[name=csrf_token]').attr('content') || $('input[name="__CSRFToken__"]').val();
    if (!csrfToken) {
        debugLog('CSRF token not found - upload aborted', 'ERROR');
        replacePlaceholder(editor, placeholder, '');
        hideUploadProgress(editor, uploadId);
        showUploadError(editor, 'Upload failed: Security token not found. Please reload the page.');
        return;
    }

    formData.append('__CSRFToken__', csrfToken);

    $.ajax({
        url: editor.uploadUrl,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        dataType: 'json',
        global: false,
        success: (response) => {
            handleUploadSuccess(editor, response, placeholder, uploadId);
        },
        error: (xhr) => {
            handleUploadError(editor, xhr, placeholder, uploadId);
        }
    });
}

/**
 * Handle successful image upload
 */
function handleUploadSuccess(editor, response, placeholder, uploadId) {
    hideUploadProgress(editor, uploadId);

    const keys = Object.keys(response);
    if (keys.length === 0) {
        replacePlaceholder(editor, placeholder, '![Upload failed]()');
        return;
    }

    const fileData = response[keys[0]];
    const fileName = keys[0];

    if (fileData.draft_id && !editor.draftId) {
        editor.draftId = fileData.draft_id;
        updateUploadUrl(editor);
        debugLog('Draft ID set to: ' + editor.draftId, 'DEBUG');
    }

    const rawUrl = fileData.url || 'file.php?key=' + String(fileData.id) + '&disposition=inline';
    const imageUrl = /^https?:\/\//.test(rawUrl) || /file\.php\?/.test(rawUrl) ? rawUrl : '#invalid-url';
    const altText = fileName.replace(/\.[^.]+$/, '').replace(/[\[\]()]/g, '');
    const markdown = `![${altText}](${imageUrl})`;

    replacePlaceholder(editor, placeholder, markdown);
    debugLog('Image uploaded successfully: ' + fileName, 'INFO');
}

/**
 * Handle failed image upload
 */
function handleUploadError(editor, xhr, placeholder, uploadId) {
    hideUploadProgress(editor, uploadId);

    let errorMsg = 'Upload failed';
    try {
        const resp = JSON.parse(xhr.responseText);
        if (resp.error) errorMsg = String(resp.error).substring(0, 200);
    } catch (e) {
        if (xhr.responseText) {
            errorMsg = xhr.responseText.replace(/<[^>]*>/g, '').substring(0, 200);
        }
    }

    replacePlaceholder(editor, placeholder, '');
    showUploadError(editor, errorMsg);
    debugLog('Image upload failed: ' + errorMsg, 'ERROR');
}

/**
 * Show upload progress indicator
 */
function showUploadProgress(editor, uploadId) {
    if (!editor.container) return;
    const $indicator = $('<div>', {
        class: 'markdown-upload-indicator',
        'data-upload-id': uploadId,
        html: '<span class="markdown-upload-spinner"></span> <span class="markdown-upload-text">Uploading image...</span>'
    });
    editor.container.append($indicator);
}

/**
 * Hide upload progress indicator
 */
function hideUploadProgress(editor, uploadId) {
    if (!editor.container) return;
    editor.container.find(`.markdown-upload-indicator[data-upload-id="${uploadId}"]`).remove();
}

/**
 * Show upload error notification
 */
export function showUploadError(editor, message) {
    if (!editor.container) return;
    const $error = $('<div>', {
        class: 'markdown-upload-error',
        text: message
    });
    editor.container.append($error);
    setTimeout(() => $error.fadeOut(300, () => $error.remove()), 5000);
}

/**
 * Open file dialog for image upload via toolbar button
 *
 * @param {object} editor - MarkdownEditor instance
 */
export function triggerImageFileDialog(editor) {
    if (!editor.uploadUrl) {
        showUploadError(editor, 'Image upload not available \u2014 no draft context found.');
        return;
    }

    const ALLOWED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/bmp';
    const $input = $('<input>', {
        type: 'file',
        accept: ALLOWED_TYPES,
        multiple: true,
        css: { display: 'none' }
    });

    $input.on('change', (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            uploadImage(editor, files[i]);
        }
        $input.remove();
    });

    $('body').append($input);
    $input[0].click();

    setTimeout(() => {
        if ($input.parent().length) $input.remove();
    }, 60000);
}
