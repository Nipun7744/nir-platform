'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { useChallenges } from '@/hooks/use-content';
import { challengeTimeLeftMs, pickPromotedChallenge, splitDuration } from '@/lib/challenge-dates';
import { useChallengeText } from '@/lib/challenge-i18n';
import { textLang } from '@/lib/text-lang';

const DISMISSED_KEY_PREFIX = 'nir-challenge-popup-dismissed:';

/**
 * Live "11 Days : 17 Hours : 24 Minutes" countdown to the end of the deadline day (UTC, the same
 * cutoff the API uses), on a single line — no seconds (user request, 2026-11-19). Re-renders on
 * each minute boundary; renders nothing once the deadline passes.
 */
function Countdown({ deadline }: { deadline?: string | null }) {
  const t = useTranslations('home.challengePopup.countdown');
  const tx = useChallengeText();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // The deadline falls on a minute boundary, so ticking on the minute keeps the display exact.
    let id: number;
    const tick = () => {
      setNow(Date.now());
      id = window.setTimeout(tick, 60_000 - (Date.now() % 60_000));
    };
    id = window.setTimeout(tick, 60_000 - (Date.now() % 60_000));
    return () => window.clearTimeout(id);
  }, []);
  const left = challengeTimeLeftMs(deadline, now);
  if (left === null) return null;
  const parts = splitDuration(left);
  const num = new Intl.NumberFormat(tx.locale === 'bn' ? 'bn-BD' : 'en-US', { minimumIntegerDigits: 2, useGrouping: false });
  const units = [
    ['days', parts.days],
    ['hours', parts.hours],
    ['minutes', parts.minutes],
  ] as const;
  return (
    <div
      role="timer"
      aria-label={t('aria', parts)}
      className="relative isolate inline-flex shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full bg-amber/25 px-2.5 py-1 text-amber-deep ring-1 ring-inset ring-amber/70"
    >
      {/* Light sweep: a soft white band that glides behind the text (z-index below it), so it only
          brightens the background as it passes — readability is unaffected. Decorative; hidden
          when the visitor prefers reduced motion. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 animate-light-sweep bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:hidden"
      />
      <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      <span className="inline-flex items-baseline gap-1">
        {units.map(([unit, value], i) => (
          <span key={unit} className="inline-flex items-baseline gap-1" aria-hidden="true">
            {i > 0 && <span className="font-mono text-sm font-bold">:</span>}
            <span className="font-mono text-[15px] font-extrabold tabular-nums text-navy">{num.format(value)}</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.04em]">{t(unit)}</span>
          </span>
        ))}
      </span>
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
                {/* "Open now" pill and the countdown sit side by side on one row (sm and up); only on
                    phones too narrow for both does the countdown drop below the pill. */}
                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-nirgreen-deep px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-white">
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
