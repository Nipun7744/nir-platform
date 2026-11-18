import {
  EMAIL_COLORS as C,
  brandedTextFooter,
  renderBrandedEmail,
  textToHtmlParagraphs,
  type EmailLocale,
} from '../messaging/templates/branded-layout';
import type { MailAttachment } from '../messaging/mail.service';

/**
 * An admin's bulk email to challenge participants, in the shared NIR shell (branded-layout.ts).
 * The admin writes one subject + plain-text body (placeholders already filled in by the caller);
 * the eyebrow and footer note are in the recipient's own language.
 */
const COPY = {
  en: {
    eyebrow: 'Innovation challenge',
    why: (challenge: string) => `You are receiving this because you submitted to the “${challenge}” challenge on NIR.`,
  },
  bn: {
    eyebrow: 'উদ্ভাবন চ্যালেঞ্জ',
    why: (challenge: string) => `আপনি NIR-এ “${challenge}” চ্যালেঞ্জে অংশ নিয়েছেন বলে এই ইমেইলটি পাচ্ছেন।`,
  },
} as const;

export function renderBulkEmail(input: {
  subject: string;
  body: string;
  locale: EmailLocale;
  challengeTitle: string;
}): { subject: string; text: string; html: string; attachments: MailAttachment[] } {
  const locale: EmailLocale = input.locale === 'bn' ? 'bn' : 'en';
  const copy = COPY[locale];
  const why = copy.why(input.challengeTitle);
  const paragraphStyle = `margin:0 0 16px 0;font-size:15px;line-height:24px;color:${C.navy};`;
  const firstLine = input.body.trim().split('\n')[0]?.slice(0, 140) ?? '';
  const { html, attachments } = renderBrandedEmail({
    locale,
    title: input.subject,
    preheader: firstLine,
    eyebrow: `${copy.eyebrow} · ${input.challengeTitle}`,
    heading: input.subject,
    contentHtml: textToHtmlParagraphs(input.body, paragraphStyle),
    footerNote: why,
  });
  const text = [input.subject, '', input.body.trim(), '', brandedTextFooter(locale, undefined, why)].join('\n');
  return { subject: input.subject, text, html, attachments };
}
