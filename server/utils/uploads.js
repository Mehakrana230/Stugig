const path = require('path');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.doc', '.docx']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

const getFileExtension = (value = '') => {
  if (typeof value !== 'string') return '';
  if (value.startsWith('data:')) {
    const match = value.match(/^data:([^;]+);/i);
    return match ? `.${match[1].split('/')[1] || ''}` : '';
  }

  const normalized = value.split('?')[0];
  const baseName = path.basename(normalized);
  return path.extname(baseName).toLowerCase();
};

const getMimeTypeFromValue = (value = '') => {
  if (typeof value !== 'string') return '';
  if (value.startsWith('data:')) {
    const match = value.match(/^data:([^;]+);/i);
    return match ? match[1].toLowerCase() : '';
  }
  return '';
};

const validateAttachments = (attachments = [], options = {}) => {
  const safeAttachments = Array.isArray(attachments) ? attachments : [];
  const maxItems = options.maxItems || 5;

  if (safeAttachments.length > maxItems) {
    return { isValid: false, message: `You can upload up to ${maxItems} files.` };
  }

  for (const attachment of safeAttachments) {
    if (typeof attachment !== 'string' || !attachment.trim()) {
      return { isValid: false, message: 'Each attachment must be a non-empty string.' };
    }

    const extension = getFileExtension(attachment);
    const mimeType = getMimeTypeFromValue(attachment);

    if (!extension) {
      return { isValid: false, message: 'Each attachment must include a supported file extension.' };
    }

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return { isValid: false, message: `Unsupported file type: ${extension}` };
    }

    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
      return { isValid: false, message: `Unsupported MIME type: ${mimeType}` };
    }
  }

  return { isValid: true, attachments: safeAttachments };
};

module.exports = {
  validateAttachments,
};
