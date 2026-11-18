'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { useChallenges } from '@/hooks/use-content';
import { challengeTimeLeftMs, pickPromotedChallenge, splitDuration } from '@/lib/challenge-dates';
import { useChallengeText } from '@/lib/challenge-i18n';
import { textLang } from '@/lib/text-lang';

const DISMISSED_KEY_PREFIX = 'nir-challenge-popup-dismissed:';

/**
 * Live "Days : Hours : Minutes : Seconds" countdown to the end of the deadline day (UTC, the same
 * cutoff the API uses). Ticks every second while mounted; renders nothing once the deadline passes.
 */
function Countdown({ deadline }: { deadline?: string | null }) {
  const t = useTranslations('home.challengePopup.countdown');
  const tx = useChallengeText();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = challengeTimeLeftMs(deadline, now);
  if (left === null) return null;
  const parts = splitDuration(left);
  const num = new Intl.NumberFormat(tx.locale === 'bn' ? 'bn-BD' : 'en-US', { minimumIntegerDigits: 2, useGrouping: false });
  const units = [
    ['days', parts.days],
    ['hours', parts.hours],
    ['minutes', parts.minutes],
    ['seconds', parts.seconds],
  ] as const;
  return (
    <div
      role="timer"
      aria-label={t('aria', parts)}
      className="inline-flex items-start gap-1 rounded-xl bg-amber/20 px-2.5 py-1.5 text-amber-deep"
    >
      {units.map(([unit, value], i) => (
        <span key={unit} className="flex items-start gap-1" aria-hidden="true">
          {i > 0 && <span className="font-mono text-base font-bold leading-5">:</span>}
          <span className="flex min-w-[2.25rem] flex-col items-center">
            <span className="font-mono text-base font-bold leading-5 tabular-nums">{num.format(value)}</span>
            <span className="text-[9px] font-semibold uppercase leading-3 tracking-[0.04em]">{t(unit)}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

// Popup is scoped to the public marketing site — dashboard/auth routes have their own tasks in flight.
const HIDDEN_ROUTES = ['/dashboard', '/sign-in', '/register', '/forgot-password'];

export function ChallengePopup() {
  const t = useTranslations('home.challengePopup');
  const tx = useChallengeText();
  const formatPopupDate = (value: string) => tx.date(value, { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
  const pathname = usePathname();
  const { data } = useChallenges();
  const challenge = pickPromotedChallenge(data);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!challenge) return;
    if (sessionStorage.getItem(DISMISSED_KEY_PREFIX + challenge.slug)) return;
    setOpen(true);
  }, [challenge]);

  const hiddenRoute = HIDDEN_ROUTES.some((route) => pathname.startsWith(route));
  const show = open && Boolean(challenge) && !hiddenRoute;

  // Lock page scroll only while the popup is actually on screen. Keying this on `open` locked
  // scrolling on the hidden routes (/register, /sign-in, /dashboard) behind an invisible popup.
  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  const close = () => {
    if (challenge) sessionStorage.setItem(DISMISSED_KEY_PREFIX + challenge.slug, '1');
    setOpen(false);
  };

  // Modal dialog keyboard behaviour (WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.11 — 2026-11-17):
  //  - on open, focus moves to the dialog panel itself (tabIndex=-1, no outline), so screen readers
  //    announce it and Tab starts inside it — and no focus ring appears on screen;
  //  - Tab / Shift+Tab cycle through the dialog's controls instead of reaching the page behind it;
  //  - Escape closes it; on close, focus returns to whatever had it before.
  useEffect(() => {
    if (!show) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 0);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      const back = returnFocusRef.current;
      if (back && back !== document.body && document.contains(back)) back.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  return (
    <AnimatePresence>
      {show && challenge && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        >
          {/* The dialog role sits on the panel (not the dimmed backdrop), named by its heading and
              described by the teaser text. */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="challenge-popup-title"
            aria-describedby="challenge-popup-desc"
            tabIndex={-1}
            className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl2 bg-white shadow-soft outline-none"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label={t('close')}
              className="focus-ring absolute right-4 top-4 z-10 rounded-full bg-white/80 p-1.5 text-slate backdrop-blur transition hover:bg-mist hover:text-navy"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="overflow-y-auto">
              {challenge.bannerImageUrl && (
                <div className="relative aspect-[16/7] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={challenge.bannerImageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}

              <div className="p-6 sm:p-8">
                {/* "Open now" pill and the countdown share one row; they wrap only on narrow phones. */}
                <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-nirgreen-deep px-3 py-1 text-xs font-semibold uppercase tracking-[0.04em] text-white">
                  <span className="relative inline-block h-2 w-2 shrink-0 rounded-full bg-white" aria-hidden="true">
                    <span className="absolute -inset-1 animate-live-pulse rounded-full border-[1.5px] border-white" />
                  </span>
                  {t('eyebrow')}
                </span>
                <Countdown deadline={challenge.deadline} />
                </div>

                <h2
                  id="challenge-popup-title"
                  className="my-3.5 font-display text-2xl font-bold text-navy"
                  lang={textLang(tx.title(challenge), tx.locale)}
                >
                  {tx.title(challenge)}
                </h2>
                {/* Teaser only — the full write-up lives on the details page ("View details"). */}
                <p id="challenge-popup-desc" className="line-clamp-3 text-slate" lang={textLang(tx.description(challenge), tx.locale)}>
                  {tx.description(challenge)}
                </p>

                <div className="my-6 flex flex-wrap gap-8">
                  {challenge.deadline && (
                    <div>
                      <b className="block font-mono text-sm text-navy">
                        {challenge.startDate && `${formatPopupDate(challenge.startDate)} – `}
                        {formatPopupDate(challenge.deadline)}
                      </b>
                      <span className="text-xs uppercase tracking-[0.08em] text-slate">
                        {challenge.startDate ? t('timeline') : t('deadline')}
                      </span>
                    </div>
                  )}
                  <div>
                    <b className="block font-mono text-sm text-navy">{tx.organizer(challenge).toUpperCase()}</b>
                    <span className="text-xs uppercase tracking-[0.08em] text-slate">{t('organizer')}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3.5">
                  {challenge.acceptingSubmissions && (
                    <Link
                      href={`/challenges/${challenge.slug}/submit`}
                      onClick={close}
                      className="focus-ring rounded-full bg-nirgreen-deep px-[26px] py-[13px] text-base font-semibold text-white transition hover:bg-nirgreen-dark"
                    >
                      {tx.submitLabel(challenge, t('applyNow'))}
                    </Link>
                  )}
                  <Link
                    href={`/challenges/${challenge.slug}`}
                    onClick={close}
                    className="focus-ring rounded-full border-[1.5px] border-greenline px-[26px] py-[13px] text-base font-semibold text-navy transition hover:bg-mist"
                  >
                    {t('viewDetails')}
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="focus-ring ml-auto rounded-md px-2 py-2 text-sm font-medium text-slate hover:text-navy"
                  >
                    {t('dismiss')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
