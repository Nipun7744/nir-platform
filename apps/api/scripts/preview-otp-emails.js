// Renders every OTP email variant (each OtpPurpose × en/bn) to HTML files for a quick visual check
// in a browser. The CID logo is swapped for a data: URI so it shows outside a mail client — real
// emails keep the CID attachment. Uses the compiled template, so build first:
//
//   cd apps/api && npm run build && node scripts/preview-otp-emails.js [outDir]
//
// Default outDir: <repo>/.logs/email-preview (git-ignored).
const fs = require('node:fs');
const path = require('node:path');
const { OtpPurpose } = require('@prisma/client');
const { renderOtpEmail } = require('../dist/messaging/templates/otp-email');

const outDir = path.resolve(process.argv[2] ?? path.join(__dirname, '..', '..', '..', '.logs', 'email-preview'));
fs.mkdirSync(outDir, { recursive: true });

const index = [];
for (const purpose of Object.values(OtpPurpose)) {
  for (const locale of ['en', 'bn']) {
    const mail = renderOtpEmail({ purpose, code: '482913', minutes: 5, locale });
    let html = mail.html;
    for (const a of mail.attachments) {
      if (a.cid) html = html.split(`cid:${a.cid}`).join(`data:${a.contentType};base64,${a.content.toString('base64')}`);
    }
    const file = `${purpose.toLowerCase()}-${locale}.html`;
    fs.writeFileSync(path.join(outDir, file), html, 'utf8');
    fs.writeFileSync(path.join(outDir, file.replace('.html', '.txt')), `Subject: ${mail.subject}\n\n${mail.text}\n`, 'utf8');
    index.push(`<li><a href="${file}">${file}</a> — ${mail.subject.replace(/</g, '&lt;')} (${Buffer.byteLength(mail.html)} bytes)</li>`);
  }
}
fs.writeFileSync(path.join(outDir, 'index.html'), `<!doctype html><meta charset="utf-8"><title>OTP email previews</title><ul>${index.join('')}</ul>`, 'utf8');
console.log(`Wrote ${index.length} previews to ${outDir}`);
