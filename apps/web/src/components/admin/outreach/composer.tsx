'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Mail, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import {
  useOutreachConfig,
  usePreviewMessage,
  useSendBulkMessage,
  useSendBulkOtp,
  type MessageChannel,
  type MessagePreview,
} from '@/hooks/use-outreach';
import {
  Card,
  ErrorNote,
  estimateSmsParts,
  inputCls,
  primaryBtn,
  secondaryBtn,
  useFormatDate,
  useOutreachError,
  type OutreachErrorText,
} from './outreach-ui';

type Step = 'compose' | 'review' | 'done';

const newRequestKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

/**
 * Bulk email/SMS to one challenge's participants. Compose → "Review recipients" (server preview:
 * counts, skipped + reasons, sample for the first recipient, duplicate warning) → code sent to the
 * admin's own email/phone → confirm. The request key is fixed per reviewed message, so a double
 * click or retry can never queue a second copy (the API returns the first one).
 */
export function Composer({ challengeId, onQueued }: { challengeId: string; onQueued: () => void }) {
  const t = useTranslations('outreach');
  const locale = useLocale();
  const fmt = useFormatDate();
  const errorText = useOutreachError();
  const { data: config } = useOutreachConfig();
  const preview = usePreviewMessage();
  const sendOtp = useSendBulkOtp();
  const send = useSendBulkMessage();

  const [step, setStep] = useState<Step>('compose');
  const [channel, setChannel] = useState<MessageChannel>('EMAIL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; body?: string }>({});
  const [composeError, setComposeError] = useState<OutreachErrorText | null>(null);
  const [review, setReview] = useState<MessagePreview | null>(null);
  const [requestKey, setRequestKey] = useState('');
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const [otpChannel, setOtpChannel] = useState<MessageChannel>('EMAIL');
  const [otpSent, setOtpSent] = useState<{ sentTo: string; minutes: number } | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<OutreachErrorText | null>(null);
  const [result, setResult] = useState<{ count: number; replayed: boolean } | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);

  const limits = config?.limits;
  const maxBody = channel === 'SMS' ? limits?.smsBodyMax ?? 480 : limits?.emailBodyMax ?? 10000;
  const smsAvailable = config?.channels.SMS ?? false;
  const otpChannels = config?.otp.channels ?? ['EMAIL'];

  // Switching challenge abandons the current review (its recipients belong to the old one).
  useEffect(() => {
    setStep('compose');
    setReview(null);
    setResult(null);
  }, [challengeId]);

  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'review') reviewHeadingRef.current?.focus();
  }, [step]);

  const insertPlaceholder = (name: string) => {
    const token = `{{${name}}}`;
    const el = bodyRef.current;
    if (!el) return setBody((b) => b + token);
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const validate = () => {
    const e: { subject?: string; body?: string } = {};
    if (channel === 'EMAIL' && !subject.trim()) e.subject = t('errSubjectRequired');
    if (!body.trim()) e.body = t('errBodyRequired');
    else if (body.length > maxBody) e.body = t('errTooLong', { max: maxBody });
    return e;
  };

  const onReview = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setComposeError(null);
    const found = validate();
    setErrors(found);
    if (found.subject) return document.getElementById('bulk-subject')?.focus();
    if (found.body) return bodyRef.current?.focus();
    try {
      const r = await preview.mutateAsync({ challengeId, channel, subject: channel === 'EMAIL' ? subject : undefined, body });
      setReview(r);
      setRequestKey(newRequestKey());
      setAllowRepeat(false);
      setShowSkipped(false);
      setOtpSent(null);
      setCode('');
      setCodeError(null);
      setConfirmError(null);
      setOtpChannel(otpChannels[0] ?? 'EMAIL');
      setStep('review');
    } catch (e) {
      setComposeError(errorText(e));
    }
  };

  const onSendCode = async () => {
    setConfirmError(null);
    try {
      const r = await sendOtp.mutateAsync({ otpChannel, locale });
      setOtpSent({ sentTo: r.sentTo, minutes: Math.round(r.expiresInSeconds / 60) });
      setResendAt(Date.now() + r.resendInSeconds * 1000);
      setNow(Date.now());
      requestAnimationFrame(() => document.getElementById('bulk-code')?.focus());
    } catch (e) {
      const retry = (e as { details?: { retryAfterSeconds?: number } })?.details?.retryAfterSeconds;
      if (retry) {
        setResendAt(Date.now() + retry * 1000);
        setNow(Date.now());
      }
      setConfirmError(errorText(e));
    }
  };

  const onConfirm = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (send.isPending || !review) return;
    setConfirmError(null);
    if (!/^\d{6}$/.test(code)) {
      setCodeError(t('errCodeLength'));
      document.getElementById('bulk-code')?.focus();
      return;
    }
    setCodeError(null);
    try {
      const r = await send.mutateAsync({
        challengeId,
        channel,
        subject: channel === 'EMAIL' ? subject : undefined,
        body,
        otpChannel,
        otpCode: code,
        requestKey,
        allowRepeat: allowRepeat || undefined,
      });
      setResult({ count: r.totalRecipients - r.skippedCount, replayed: Boolean(r.replayed) });
      setStep('done');
      onQueued();
    } catch (e) {
      const mapped = errorText(e);
      if (mapped.field === 'code') {
        setCodeError(mapped.text);
        // Select the wrong code so typing the right one replaces it (the field is capped at 6).
        const input = document.getElementById('bulk-code') as HTMLInputElement | null;
        input?.focus();
        input?.select();
      } else setConfirmError(mapped);
    }
  };

  const startOver = () => {
    setStep('compose');
    setSubject('');
    setBody('');
    setReview(null);
    setResult(null);
    send.reset();
  };

  // ------------------------------------------------------------------------------- render

  if (step === 'done' && result) {
    return (
      <Card id="compose-title" title={t('composeTitle')}>
        <div role="status" className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{result.replayed ? t('alreadyQueued') : t('queued', { count: result.count })}</p>
        </div>
        <button type="button" className={`${secondaryBtn} mt-4`} onClick={startOver}>
          {t('newMessage')}
        </button>
      </Card>
    );
  }

  if (step === 'review' && review) {
    const blocked = review.recipientCount === 0 || review.overLimit || (review.duplicateOf !== null && !allowRepeat);
    return (
      <Card id="compose-title" title={t('composeTitle')}>
        <h3 ref={reviewHeadingRef} tabIndex={-1} className="font-display text-lg font-bold text-ink-900 outline-none">
          {t('reviewTitle')}
        </h3>

        <div className="mt-3 flex items-start gap-3 rounded-xl bg-mist p-4">
          <Users className="mt-1 h-6 w-6 shrink-0 text-brand-700" aria-hidden="true" />
          <div>
            <p className="font-display text-xl font-extrabold text-ink-900">{t('recipientsHeadline', { count: review.recipientCount })}</p>
            <p className="text-sm text-ink-600">{t('recipientsDetail', { total: review.totalParticipants, skipped: review.skippedCount })}</p>
          </div>
        </div>

        {review.skippedCount > 0 && (
          <div className="mt-3">
            <button
              type="button"
              aria-expanded={showSkipped}
              aria-controls="skipped-list"
              onClick={() => setShowSkipped((v) => !v)}
              className="focus-ring rounded text-sm font-semibold text-brand-700 underline underline-offset-2"
            >
              {t('skippedToggle')}
            </button>
            {showSkipped && (
              <ul id="skipped-list" className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-ink-100 p-3 text-sm">
                {review.skipped.map((s, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-x-3">
                    <span className="text-ink-900">{s.name}{s.address ? <span className="text-ink-600"> · {s.address}</span> : null}</span>
                    {/* Reasons come from the API in English. */}
                    <span lang={locale === 'en' ? undefined : 'en'} className="text-ink-600">{s.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {review.overLimit && <div className="mt-3"><ErrorNote>{t('overLimit', { max: review.maxRecipients })}</ErrorNote></div>}
        {review.recipientCount === 0 && <div className="mt-3"><ErrorNote>{t('noRecipients')}</ErrorNote></div>}

        {review.sample && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">{t('sampleTitle', { name: review.sample.recipientName })}</p>
            <div className="mt-1.5 rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-900 shadow-inner">
              {review.sample.subject && (
                <p className="mb-2 border-b border-ink-100 pb-2 font-semibold">
                  <span className="font-normal text-ink-600">{t('sampleSubject')} </span>
                  {review.sample.subject}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">{review.sample.body}</p>
              {review.sample.sms && (
                <p className="mt-2 text-xs text-ink-600">{t('smsParts', { parts: review.sample.sms.segments, encoding: review.sample.sms.encoding })}</p>
              )}
            </div>
          </div>
        )}

        {review.duplicateOf && (
          <div className="mt-4 rounded-xl border-l-4 border-amber bg-sun-50 p-4 text-sm text-ink-900">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden="true" />
              {t('duplicateWarning', { date: fmt(review.duplicateOf.createdAt), by: review.duplicateOf.createdBy, sent: review.duplicateOf.sentCount })}
            </p>
            <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-2 font-semibold">
              <input type="checkbox" checked={allowRepeat} onChange={(e) => setAllowRepeat(e.target.checked)} className="h-4 w-4 accent-brand-600" />
              {t('duplicateConfirm')}
            </label>
          </div>
        )}

        {!review.overLimit && review.recipientCount > 0 && (
          <form onSubmit={onConfirm} noValidate className="mt-5 rounded-xl border border-ink-100 p-4">
            <p className="flex items-center gap-2 font-semibold text-ink-900">
              <ShieldCheck className="h-5 w-5 text-brand-700" aria-hidden="true" /> {t('confirmTitle')}
            </p>
            <p className="mt-1 text-sm text-ink-600">{t('confirmIntro')}</p>

            {otpChannels.length > 1 && (
              <fieldset className="mt-3">
                <legend className="mb-1.5 text-xs font-medium text-ink-600">{t('otpWhere')}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {otpChannels.map((ch) => (
                    <label
                      key={ch}
                      className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border-2 px-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-nirgreen-deep ${
                        otpChannel === ch ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-400 text-ink-700'
                      }`}
                    >
                      <input type="radio" name="otp-channel" checked={otpChannel === ch} onChange={() => setOtpChannel(ch)} className="sr-only" />
                      {ch === 'EMAIL'
                        ? t('otpToEmail', { target: config?.otp.targets.EMAIL ?? '' })
                        : t('otpToSms', { target: config?.otp.targets.SMS ?? '' })}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" className={secondaryBtn} onClick={onSendCode} disabled={sendOtp.isPending || resendIn > 0}>
                {sendOtp.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {sendOtp.isPending ? t('sendingCode') : resendIn > 0 ? t('resendIn', { seconds: resendIn }) : otpSent ? t('resendCode') : t('sendCode')}
              </button>
              <p role="status" className="text-sm text-brand-700">
                {otpSent ? t('codeSent', { target: otpSent.sentTo, minutes: otpSent.minutes }) : ''}
              </p>
            </div>

            {otpSent && (
              <div className="mt-3 max-w-xs">
                <label htmlFor="bulk-code" className="mb-1 block text-sm font-medium text-ink-700">
                  {t('codeLabel')}
                </label>
                <input
                  id="bulk-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  aria-invalid={codeError ? true : undefined}
                  aria-describedby={codeError ? 'bulk-code-error' : undefined}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setCodeError(null);
                  }}
                  className={`${inputCls} text-center font-mono text-xl tracking-[0.4em]`}
                />
                {codeError && (
                  <p id="bulk-code-error" role="alert" className="mt-1.5 text-sm font-medium text-red-700">
                    {codeError}
                  </p>
                )}
              </div>
            )}

            {confirmError && <div className="mt-3"><ErrorNote lang={confirmError.lang}>{confirmError.text}</ErrorNote></div>}

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className={secondaryBtn} onClick={() => setStep('compose')}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t('editMessage')}
              </button>
              <button type="submit" className={primaryBtn} disabled={!otpSent || send.isPending || blocked}>
                {send.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {send.isPending ? t('sendingNow') : t('confirmSend', { count: review.recipientCount })}
              </button>
            </div>
          </form>
        )}
        {(review.overLimit || review.recipientCount === 0) && (
          <button type="button" className={`${secondaryBtn} mt-4`} onClick={() => setStep('compose')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t('editMessage')}
          </button>
        )}
      </Card>
    );
  }

  const sms = channel === 'SMS' ? estimateSmsParts(body) : null;
  return (
    <Card id="compose-title" title={t('composeTitle')} intro={t('composeIntro')}>
      <form onSubmit={onReview} noValidate className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink-700">{t('channelLabel')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['EMAIL', 'SMS'] as const).map((ch) => {
              const Icon = ch === 'EMAIL' ? Mail : MessageSquare;
              const disabled = ch === 'SMS' && !smsAvailable;
              return (
                <label
                  key={ch}
                  className={`flex min-h-[44px] items-center gap-2 rounded-lg border-2 px-3 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-nirgreen-deep ${
                    disabled ? 'cursor-not-allowed border-ink-100 bg-ink-50 text-ink-400' : 'cursor-pointer'
                  } ${!disabled && channel === ch ? 'border-brand-600 bg-brand-50 text-brand-800' : !disabled ? 'border-ink-400 text-ink-700' : ''}`}
                >
                  <input
                    type="radio"
                    name="bulk-channel"
                    value={ch}
                    checked={channel === ch}
                    disabled={disabled}
                    aria-describedby={disabled ? 'sms-unavailable' : undefined}
                    onChange={() => {
                      setChannel(ch);
                      setErrors({});
                      setComposeError(null);
                    }}
                    className="sr-only"
                  />
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {ch === 'EMAIL' ? t('channelEmail') : t('channelSms')}
                </label>
              );
            })}
          </div>
          {!smsAvailable && config && (
            <p id="sms-unavailable" className="mt-1.5 text-xs text-ink-600">{t('smsUnavailable')}</p>
          )}
        </fieldset>

        {channel === 'EMAIL' && (
          <div>
            <label htmlFor="bulk-subject" className="mb-1 block text-sm font-medium text-ink-700">
              {t('subjectLabel')} <span aria-hidden="true" className="text-red-700">*</span>
            </label>
            <input
              id="bulk-subject"
              required
              maxLength={limits?.subjectMax ?? 200}
              value={subject}
              aria-invalid={errors.subject ? true : undefined}
              aria-describedby={errors.subject ? 'bulk-subject-error' : undefined}
              onChange={(e) => {
                setSubject(e.target.value);
                setErrors((x) => ({ ...x, subject: undefined }));
              }}
              className={inputCls}
            />
            {errors.subject && <p id="bulk-subject-error" className="mt-1.5 text-sm font-medium text-red-700">{errors.subject}</p>}
          </div>
        )}

        <div>
          <label htmlFor="bulk-body" className="mb-1 block text-sm font-medium text-ink-700">
            {t('bodyLabel')} <span aria-hidden="true" className="text-red-700">*</span>
          </label>
          <div role="group" aria-label={t('placeholdersLabel')} className="mb-2 flex flex-wrap gap-2">
            {(config?.placeholders ?? ['name', 'challenge', 'irn']).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => insertPlaceholder(p)}
                title={t(`placeholder_${p}` as 'placeholder_name')}
                className="focus-ring inline-flex min-h-[32px] items-center gap-1 rounded-full border border-ink-400 bg-white px-3 font-mono text-xs text-ink-700 hover:border-brand-600 hover:text-brand-800"
              >
                {`{{${p}}}`}
                <span className="font-sans text-ink-600">· {t(`placeholder_${p}` as 'placeholder_name')}</span>
              </button>
            ))}
          </div>
          <textarea
            id="bulk-body"
            ref={bodyRef}
            required
            rows={channel === 'SMS' ? 4 : 9}
            value={body}
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={`bulk-body-hint${errors.body ? ' bulk-body-error' : ''}`}
            onChange={(e) => {
              setBody(e.target.value);
              setErrors((x) => ({ ...x, body: undefined }));
            }}
            className={`${inputCls} leading-relaxed`}
          />
          <div id="bulk-body-hint" className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-ink-600">
            <span>{channel === 'SMS' ? t('bodyHintSms') : t('bodyHintEmail')}</span>
            <span className={body.length > maxBody ? 'font-semibold text-red-700' : undefined}>
              {t('charCount', { count: body.length, max: maxBody })}
              {sms && body ? ` · ${t('smsParts', { parts: sms.parts, encoding: sms.encoding })}` : ''}
            </span>
          </div>
          {errors.body && <p id="bulk-body-error" className="mt-1.5 text-sm font-medium text-red-700">{errors.body}</p>}
        </div>

        {composeError && <ErrorNote lang={composeError.lang}>{composeError.text}</ErrorNote>}

        <button type="submit" className={primaryBtn} disabled={preview.isPending}>
          {preview.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {preview.isPending ? t('reviewing') : t('reviewButton')}
        </button>
      </form>
    </Card>
  );
}
