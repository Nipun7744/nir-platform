// Unit tests for readableOriginalName (src/uploads/uploads.controller.ts), against compiled dist.
// Run: npm run build && npm test   (from apps/api)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readableOriginalName } = require('../dist/uploads/uploads.controller');

// What multer hands us: the UTF-8 bytes of the name, read as latin1.
const asMulter = (s) => Buffer.from(s, 'utf8').toString('latin1');

test('re-decodes a UTF-8 (Bangla) name that multer read as latin1', () => {
  assert.equal(readableOriginalName(asMulter('প্রকল্প প্রস্তাব.pdf')), 'প্রকল্প প্রস্তাব.pdf');
});

test('leaves plain ASCII names alone', () => {
  assert.equal(readableOriginalName('Project Proposal (final).docx'), 'Project Proposal (final).docx');
});

test('keeps a genuine latin1 name that is not valid UTF-8', () => {
  assert.equal(readableOriginalName('Résumé.pdf'), 'Résumé.pdf');
});

test('strips any client-sent path', () => {
  assert.equal(readableOriginalName('C:\\Users\\me\\Desktop\\plan.pdf'), 'plan.pdf');
  assert.equal(readableOriginalName('../../etc/passwd'), 'passwd');
});
