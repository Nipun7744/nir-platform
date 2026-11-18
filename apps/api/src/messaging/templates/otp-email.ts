import { OtpPurpose } from '@prisma/client';
import type { MailAttachment } from '../mail.service';
import {
  EMAIL_COLORS as C,
  EMAIL_FONT,
  EMAIL_MONO,
  brandedTextFooter,
  escapeHtml,
  renderBrandedEmail,
  toBnDigits,
  type EmailLocale,
} from './branded-layout';

/**
 * Branded HTML email for every one-time code sent by email (OtpService.deliver). The shell is the
 * shared branded-layout.ts; this file adds the code box + security notice, and the copy per
 * purpose. PURPOSE_COPY is typed `Record<OtpPurpose, …>` so adding a purpose to the enum fails to
 * compile until it has English + Bangla copy here. The code stays ASCII digits even in Bangla (the
 * code box only accepts 0-9). Design + client rules: docs/UI_GUIDELINES.md "OTP email template".
 */

export type OtpEmailLocale = EmailLocale;

interface PurposeCopy {
  /** {code} is replaced. */
  subject: string;
  eyebrow: string;
  heading: string;
  intro: string;
  codeLabel: string;
  ifNotYou: string;
}

const PURPOSE_COPY: Record<OtpPurpose, Record<OtpEmailLocale, PurposeCopy>> = {
  REGISTRATION: {
    en: {
      subject: 'Your NIR verification code: {code}',
      eyebrow: 'Account verification',
      heading: 'Verify your email address',
      intro:
        'Use the code below to verify your email address and finish creating your National Innovation Repository (NIR) account.',
      codeLabel: 'Your verification code',
      ifNotYou: "If you didn't try to create an NIR account, you can safely ignore this email. No account will be created.",
    },
    bn: {
      subject: 'NIR যাচাইকরণ কোড: {code}',
      eyebrow: 'অ্যাকাউন্ট যাচাইকরণ',
      heading: 'আপনার ইমেইল ঠিকানা যাচাই করুন',
      intro:
        'ন্যাশনাল ইনোভেশন রিপোজিটরি (NIR)-তে আপনার অ্যাকাউন্ট তৈরি সম্পন্ন করতে নিচের কোডটি দিয়ে ইমেইল ঠিকানা যাচাই করুন।',
      codeLabel: 'আপনার যাচাইকরণ কোড',
      ifNotYou: 'আপনি NIR অ্যাকাউন্ট তৈরির চেষ্টা না করে থাকলে এই ইমেইলটি উপেক্ষা করুন। কোনো অ্যাকাউন্ট তৈরি হবে না।',
    },
  },
  PASSWORD_RESET: {
    en: {
      subject: 'Your NIR password reset code: {code}',
      eyebrow: 'Password reset',
      heading: 'Reset your password',
      intro:
        'We received a request to reset the password of your National Innovation Repository (NIR) account. Enter the code below to choose a new password.',
      codeLabel: 'Your password reset code',
      ifNotYou:
        "If you didn't ask to reset your password, ignore this email. Your password stays unchanged and nobody can change it without this code.",
    },
    bn: {
      subject: 'NIR পাসওয়ার্ড রিসেট কোড: {code}',
      eyebrow: 'পাসওয়ার্ড রিসেট',
      heading: 'আপনার পাসওয়ার্ড রিসেট করুন',
      intro:
        'আপনার ন্যাশনাল ইনোভেশন রিপোজিটরি (NIR) অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার একটি অনুরোধ পেয়েছি। নতুন পাসওয়ার্ড দিতে নিচের কোডটি লিখুন।',
      codeLabel: 'আপনার পাসওয়ার্ড রিসেট কোড',
      ifNotYou:
        'আপনি পাসওয়ার্ড রিসেটের অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করুন। আপনার পাসওয়ার্ড অপরিবর্তিত থাকবে; এই কোড ছাড়া কেউ তা বদলাতে পারবে না।',
    },
  },
  BULK_MESSAGE_CONFIRM: {
    en: {
      subject: 'Confirm your NIR bulk message: {code}',
      eyebrow: 'Administrator confirmation',
      heading: 'Confirm a bulk message',
      intro:
        'You are about to send a bulk email or SMS to challenge participants from the NIR admin panel. Enter the code below to confirm the send.',
      codeLabel: 'Your confirmation code',
      ifNotYou:
        "If you didn't start a bulk message, don't share this code with anyone and tell the platform administrator — someone may be using your admin account.",
    },
    bn: {
      subject: 'NIR বাল্ক বার্তা নিশ্চিতকরণ কোড: {code}',
      eyebrow: 'অ্যাডমিনিস্ট্রেটর নিশ্চিতকরণ',
      heading: 'বাল্ক বার্তা পাঠানো নিশ্চিত করুন',
      intro:
        'আপনি NIR অ্যাডমিন প্যানেল থেকে চ্যালেঞ্জের অংশগ্রহণকারীদের কাছে বাল্ক ইমেইল বা এসএমএস পাঠাতে যাচ্ছেন। পাঠানো নিশ্চিত করতে নিচের কোডটি লিখুন।',
      codeLabel: 'আপনার নিশ্চিতকরণ কোড',
      ifNotYou:
        'আপনি কোনো বাল্ক বার্তা পাঠানো শুরু না করে থাকলে এই কোড কাউকে জানাবেন না এবং প্ল্যাটফর্ম অ্যাডমিনিস্ট্রেটরকে জানান — কেউ আপনার অ্যাডমিন অ্যাকাউন্ট ব্যবহার করে থাকতে পারে।',
    },
  },
};

const COMMON = {
  en: {
    greeting: 'Hello,',
    expires: (m: string) => `This code expires in <strong>${m} minutes</strong>.`,
    expiresText: (m: string) => `This code expires in ${m} minutes.`,
    securityTitle: 'Keep this code private',
    securityBody: 'Never share it with anyone. NIR staff will never ask for this code by phone, email or message.',
  },
  bn: {
    greeting: 'শুভেচ্ছা,',
    expires: (m: string) => `কোডটি <strong>${m} মিনিট</strong> পর্যন্ত বৈধ।`,
    expiresText: (m: string) => `কোডটি ${m} মিনিট পর্যন্ত বৈধ।`,
    securityTitle: 'কোডটি গোপন রাখুন',
    securityBody: 'এই কোড কাউকে জানাবেন না। NIR-এর কোনো কর্মী কখনো ফোন, ইমেইল বা বার্তায় এই কোড চাইবে না।',
  },
} as const;

export interface OtpEmailInput {
  purpose: OtpPurpose;
  code: string;
  /** Minutes until the code expires. */
  minutes: number;
  locale: OtpEmailLocale;
  /** Defaults to now; injectable for stable previews/tests. */
  year?: number;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
  attachments: MailAttachment[];
}

export function renderOtpEmail(input: OtpEmailInput): RenderedEmail {
  const locale: OtpEmailLocale = input.locale === 'bn' ? 'bn' : 'en';
  const copy = PURPOSE_COPY[input.purpose][locale];
  const common = COMMON[locale];
  const font = EMAIL_FONT[locale];
  const code = input.code.replace(/\D/g, '');
  const minutes = locale === 'bn' ? toBnDigits(String(input.minutes)) : String(input.minutes);
  const subject = copy.subject.replace('{code}', code);
  const e = escapeHtml;

  const contentHtml = `<p style="margin:0 0 8px 0;font-size:15px;line-height:24px;color:${C.navy};">${e(common.greeting)}</p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:24px;color:${C.slate};">${e(copy.intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.mist};border:2px solid ${C.green};border-radius:10px;">
      <tr><td align="center" style="padding:20px 12px 6px 12px;font-family:${font};font-size:13px;line-height:20px;font-weight:600;color:${C.slate};">${e(copy.codeLabel)}</td></tr>
      <tr><td align="center" style="padding:0 12px 6px 12px;">
        <span class="nir-code" style="font-family:${EMAIL_MONO};font-size:36px;line-height:48px;font-weight:700;letter-spacing:10px;color:${C.navy};mso-line-height-rule:exactly;">${e(code)}</span>
      </td></tr>
      <tr><td align="center" style="padding:0 12px 20px 12px;font-family:${font};font-size:14px;line-height:22px;color:${C.greenDeep};">${common.expires(e(minutes))}</td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;background-color:${C.amberTint};border-left:4px solid ${C.amber};">
      <tr><td style="padding:14px 16px;font-family:${font};font-size:14px;line-height:22px;color:${C.navy};">
        <strong style="color:${C.amberDeep};">${e(common.securityTitle)}</strong><br>
        ${e(common.securityBody)}
      </td></tr>
    </table>
    <p style="margin:24px 0 0 0;font-size:14px;line-height:22px;color:${C.slate};">${e(copy.ifNotYou)}</p>`;

  const { html, attachments } = renderBrandedEmail({
    locale,
    title: subject,
    // Shown by most inboxes next to the subject.
    preheader: `${copy.codeLabel}: ${code} · ${common.expiresText(minutes)}`,
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    contentHtml,
    year: input.year,
  });

  const text = [
    copy.heading,
    '',
    common.greeting,
    copy.intro,
    '',
    `${copy.codeLabel}: ${code}`,
    common.expiresText(minutes),
    '',
    `${common.securityTitle}: ${common.securityBody}`,
    '',
    copy.ifNotYou,
    '',
    brandedTextFooter(locale, input.year),
  ].join('\n');

  return { subject, text, html, attachments };
}
