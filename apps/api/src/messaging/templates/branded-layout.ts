import type { MailAttachment } from '../mail.service';
import { NIR_LOGO_PNG_BASE64 } from './nir-logo';

/**
 * The shared NIR email shell (brand strip, logo, eyebrow + heading, content slot, navy footer) used
 * by every HTML email the API sends: OTP codes (otp-email.ts) and admin bulk emails
 * (outreach/bulk-email.ts). Design + email-client rules: docs/UI_GUIDELINES.md "OTP email template".
 * Callers pass already-escaped HTML for `contentHtml`; everything else is escaped here.
 */

export type EmailLocale = 'en' | 'bn';

// NIR flat palette (apps/web/tailwind.config.ts) — the one docs/UI_GUIDELINES.md says to use for new work.
export const EMAIL_COLORS = {
  navy: '#13243F',
  navy2: '#1B3B6F',
  green: '#00A86B',
  greenDeep: '#007A4E',
  amber: '#F7B733',
  amberDeep: '#8A5B00',
  amberTint: '#FEF8E8',
  red: '#F42A41',
  mist: '#F2F6F4',
  line: '#DBE4DF',
  slate: '#4E5F7A',
  white: '#FFFFFF',
  footerMuted: '#C9D3E0',
} as const;

export const EMAIL_FONT: Record<EmailLocale, string> = {
  en: "'Instrument Sans','Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  bn: "'Hind Siliguri','Noto Sans Bengali','Nirmala UI',Vrinda,Arial,sans-serif",
};
export const EMAIL_MONO = "'IBM Plex Mono',Consolas,'Courier New',monospace";

const FOOTER = {
  en: {
    automated: 'This is an automated message. Please do not reply to this email.',
    siteName: 'National Innovation Repository',
    tagline: 'Documenting, evaluating and connecting innovation across Bangladesh.',
    org: "Government of the People's Republic of Bangladesh — Aspire to Innovate (a2i), ICT Division",
    address: 'E-14/X, ICT Tower, Agargaon, Sher-e-Bangla Nagar, Dhaka-1207',
    logoAlt: 'National Innovation Repository (NIR), Bangladesh',
  },
  bn: {
    automated: 'এটি একটি স্বয়ংক্রিয় বার্তা। অনুগ্রহ করে এই ইমেইলের উত্তর দেবেন না।',
    siteName: 'ন্যাশনাল ইনোভেশন রিপোজিটরি',
    tagline: 'বাংলাদেশ জুড়ে উদ্ভাবন নথিভুক্ত, মূল্যায়ন ও সংযুক্ত করা হচ্ছে।',
    org: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার — অ্যাসপায়ার টু ইনোভেট (a2i), আইসিটি বিভাগ',
    address: 'ই-১৪/এক্স, আইসিটি টাওয়ার, আগারগাঁও, শেরে বাংলা নগর, ঢাকা-১২০৭',
    logoAlt: 'ন্যাশনাল ইনোভেশন রিপোজিটরি (NIR), বাংলাদেশ',
  },
} as const;

const LOGO_CID = 'nir-logo@nir';
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plain text → escaped HTML paragraphs (blank line = new paragraph, single newline = <br>). */
export function textToHtmlParagraphs(text: string, style: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="${style}">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

export interface BrandedEmailInput {
  locale: EmailLocale;
  /** <title>; usually the subject. */
  title: string;
  /** Inbox preview text (hidden in the body). */
  preheader: string;
  eyebrow?: string;
  heading: string;
  /** Escaped HTML placed under the heading, inside the padded content column. */
  contentHtml: string;
  /** Optional extra footer line (escaped here), e.g. why the recipient got the email. */
  footerNote?: string;
  year?: number;
}

/** Plain-text footer matching the HTML one. */
export function brandedTextFooter(locale: EmailLocale, year?: number, footerNote?: string): string {
  const f = FOOTER[locale];
  const y = String(year ?? new Date().getFullYear());
  return ['--', `${f.siteName} (NIR)`, ...(footerNote ? [footerNote] : []), f.automated, `© ${locale === 'bn' ? toBnDigits(y) : y} ${f.org}`].join('\n');
}

export function renderBrandedEmail(input: BrandedEmailInput): { html: string; attachments: MailAttachment[] } {
  const locale: EmailLocale = input.locale === 'bn' ? 'bn' : 'en';
  const f = FOOTER[locale];
  const font = EMAIL_FONT[locale];
  const C = EMAIL_COLORS;
  const e = escapeHtml;
  const year = String(input.year ?? new Date().getFullYear());
  const yearLocal = locale === 'bn' ? toBnDigits(year) : year;

  const html = `<!DOCTYPE html>
<html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${e(input.title)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table,td,div,p,a,span,h1{font-family:Arial,sans-serif !important;}</style>
<![endif]-->
<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Instrument+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@600&display=swap" rel="stylesheet">
<!--<![endif]-->
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
  @media only screen and (max-width:620px) {
    .nir-pad { padding-left:20px !important; padding-right:20px !important; }
    .nir-h1 { font-size:22px !important; line-height:30px !important; }
    .nir-code { font-size:30px !important; letter-spacing:6px !important; }
    .nir-outer { padding:12px 8px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.mist};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${e(input.preheader)}${'&#8204;&nbsp;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.mist};">
<tr><td align="center" class="nir-outer" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background-color:${C.white};border:1px solid ${C.line};border-radius:12px;overflow:hidden;">
  <!-- brand strip (the logo underline colours; solid cells because Outlook ignores gradients) -->
  <tr><td style="padding:0;font-size:0;line-height:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="50%" height="6" style="height:6px;background-color:${C.green};font-size:0;line-height:0;">&nbsp;</td>
      <td width="30%" height="6" style="height:6px;background-color:${C.amber};font-size:0;line-height:0;">&nbsp;</td>
      <td width="20%" height="6" style="height:6px;background-color:${C.red};font-size:0;line-height:0;">&nbsp;</td>
    </tr></table>
  </td></tr>
  <tr><td class="nir-pad" style="padding:28px 40px 8px 40px;">
    <img src="cid:${LOGO_CID}" width="180" height="60" alt="${e(f.logoAlt)}" style="display:block;width:180px;max-width:100%;height:auto;font-family:${font};font-size:16px;font-weight:700;color:${C.navy2};">
  </td></tr>
  <tr><td class="nir-pad" style="padding:16px 40px 32px 40px;font-family:${font};">
    ${input.eyebrow ? `<p style="margin:0 0 8px 0;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.greenDeep};">${e(input.eyebrow)}</p>` : ''}
    <h1 class="nir-h1" style="margin:0 0 16px 0;font-family:${font};font-size:26px;line-height:34px;font-weight:700;color:${C.navy};">${e(input.heading)}</h1>
    ${input.contentHtml}
  </td></tr>
  <tr><td class="nir-pad" style="padding:24px 40px;background-color:${C.navy};font-family:${font};">
    <p style="margin:0 0 4px 0;font-size:15px;line-height:22px;font-weight:700;color:${C.white};">${e(f.siteName)} <span style="color:${C.green};">(NIR)</span></p>
    <p style="margin:0 0 14px 0;font-size:13px;line-height:20px;color:${C.footerMuted};">${e(f.tagline)}</p>
    ${input.footerNote ? `<p style="margin:0 0 10px 0;font-size:12px;line-height:18px;color:${C.footerMuted};">${e(input.footerNote)}</p>` : ''}
    <p style="margin:0 0 14px 0;font-size:12px;line-height:18px;color:${C.footerMuted};">${e(f.automated)}</p>
    <p style="margin:0;font-size:12px;line-height:18px;color:${C.footerMuted};">&copy; ${e(yearLocal)} ${e(f.org)}<br>${e(f.address)}</p>
  </td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;

  return {
    html,
    attachments: [
      {
        filename: 'nir-logo.png',
        content: Buffer.from(NIR_LOGO_PNG_BASE64, 'base64'),
        contentType: 'image/png',
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  };
}
