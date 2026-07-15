const assert = require('assert');
const { validateAttachments } = require('../utils/uploads');

const valid = validateAttachments(['https://example.com/photo.png', 'https://example.com/doc.pdf'], { maxItems: 5 });
assert.ok(valid.isValid, 'valid attachments should pass');

const invalid = validateAttachments(['https://example.com/file.exe']);
assert.strictEqual(invalid.isValid, false, 'exe files should be rejected');

console.log('upload-validation-ok');
