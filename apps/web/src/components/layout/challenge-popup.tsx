'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { useChallenges } from '@/hooks/use-content';

const DISMISSED_KEY_PREFIX = 'nir-challenge-popup-dismissed:';

// Popup is scoped to the public marketing site — dashboard/auth routes have their own tasks in flight.
const HIDDEN_ROUTES = ['/dashboard', '/sign-in', '/register'];

function formatPopupDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export function ChallengePopup() {
  const t = useTranslations('home.challengePopup');
  const pathname = usePathname();
  const { data } = useChallenges();
  const openChallenges = data?.filter((c) => c.status === 'OPEN');
  const challenge = openChallenges?.find((c) => c.isFeatured) ?? openChallenges?.[0];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!challenge) return;
    if (sessionStorage.getItem(DISMISSED_KEY_PREFIX + challenge.slug)) return;
    setOpen(true);
  }, [challenge]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => {
    if (challenge) sessionStorage.setItem(DISMISSED_KEY_PREFIX + challenge.slug, '1');
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hiddenRoute = HIDDEN_ROUTES.some((route) => pathname.startsWith(route));
  const show = open && Boolean(challenge) && !hiddenRoute;

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
          role="dialog"
          aria-modal="true"
          aria-labelledby="challenge-popup-title"
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-xl2 bg-white shadow-soft"
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
              <X className="h-5 w-5" />
            </button>

            {challenge.bannerImageUrl && (
              <div className="relative aspect-[16/7] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={challenge.bannerImageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}

            <div className="p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-nirgreen-deep px-3 py-1 text-xs font-semibold uppercase tracking-[0.04em] text-white">
                <span className="relative inline-block h-2 w-2 shrink-0 rounded-full bg-white">
                  <span className="absolute -inset-1 animate-live-pulse rounded-full border-[1.5px] border-white" />
                </span>
                {t('eyebrow')}
              </span>

              <h2 id="challenge-popup-title" className="my-3.5 font-display text-2xl font-bold text-navy">
                {challenge.titleEn}
              </h2>
              <p className="text-slate">{challenge.descriptionEn}</p>

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
                  <b className="block font-mono text-sm text-navy">{challenge.organizingAgency.toUpperCase()}</b>
                  <span className="text-xs uppercase tracking-[0.08em] text-slate">{t('organizer')}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3.5">
                <Link
                  href="/submit"
                  onClick={close}
                  className="focus-ring rounded-full bg-nirgreen-deep px-[26px] py-[13px] text-base font-semibold text-white transition hover:bg-nirgreen-dark"
                >
                  {t('applyNow')}
                </Link>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
