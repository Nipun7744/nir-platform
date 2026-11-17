'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Menu, Sparkles, X } from 'lucide-react';
import { LocaleSwitcher } from './locale-switcher';
import { useAuthStore } from '@/store/auth-store';
import clsx from 'clsx';
import { useGeneralSubmissionOpen } from '@/hooks/use-settings';
import { useChallenges } from '@/hooks/use-content';

/**
 * Sparkle + pulsing dot shown next to "Challenges" while at least one challenge is accepting
 * submissions (`acceptingSubmissions` from GET /challenges — published, active, submissions on,
 * OPEN and within its dates). Animations stop under prefers-reduced-motion (globals.css).
 */
function LiveChallengeMark({ label }: { label: string }) {
  return (
    <span className="relative ml-1 inline-flex items-center" title={label}>
      <Sparkles className="h-3.5 w-3.5 animate-twinkle text-sun-500" aria-hidden />
      <span className="absolute -right-1.5 -top-1 flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-nirgreen-deep" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-nirgreen-deep" />
      </span>
      <span className="sr-only">({label})</span>
    </span>
  );
}

export function SiteHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Escape closes the mobile menu and returns focus to its button (2.1.1 / 2.4.3).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  // Admin-controlled (GET /settings/submission) — hidden when general submission is switched off.
  const generalSubmissionOpen = useGeneralSubmissionOpen();
  // Same ['challenges'] query the /challenges page uses, so it's shared from the cache.
  const { data: challenges } = useChallenges();
  const challengeLive = Boolean(challenges?.some((c) => c.acceptingSubmissions));
  const liveLabel = t('nav.challengesLive');

  const navItems: { href: string; label: string; live?: boolean }[] = [
    { href: '/repository', label: t('nav.repository') },
    { href: '/challenges', label: t('nav.challenges'), live: challengeLive },
    { href: '/statistics', label: t('nav.statistics') },
    { href: '/resources', label: t('nav.resources') },
    { href: '/news', label: t('nav.news') },
    { href: '/about', label: t('nav.about') },
    { href: '/faq', label: t('nav.faq') },
  ];

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Government identity bar */}
      <div className="bg-navy text-[#C7D4E8]">
        <div className="container-page flex min-h-[36px] items-center justify-between gap-4 py-1.5 text-xs tracking-[0.03em]">
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src="/brand/govt-logo-en.svg"
              alt=""
              width={24}
              height={24}
              className="h-5 w-5 shrink-0 sm:h-6 sm:w-6"
              aria-hidden
            />
            <span className="truncate">
              {t('topbar.government')} &nbsp;·&nbsp; {t('topbar.org')}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            {/* focus-visible only: identical at rest (WCAG 2.4.7). */}
            <Link
              href={user ? '/dashboard' : '/sign-in'}
              className="rounded-sm font-medium text-white outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
            >
              {user ? t('nav.dashboard') : t('nav.signIn')}
            </Link>
            <LocaleSwitcher />
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="border-b border-greenline bg-white">
        <div className="container-page flex min-h-[76px] items-center gap-8">
          {/* The image alt is the link's name — one translated name instead of an English aria-label over it. */}
          <Link href="/" className="focus-ring shrink-0 rounded-md" aria-current={pathname === '/' ? 'page' : undefined}>
            <Image src="/brand/nir-logo.svg" alt={t('common.homeLink')} width={180} height={60} priority className="h-14 w-auto" />
          </Link>

          <nav aria-label={t('common.mainNav')} className="hidden flex-1 lg:block">
            <ul className="flex list-none gap-7 p-0">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'focus-ring inline-flex items-center border-b-2 py-2 text-sm font-medium no-underline transition',
                        active ? 'border-nirgreen-deep text-nirgreen-dark' : 'border-transparent text-navy hover:border-nirgreen-deep hover:text-nirgreen-dark',
                        item.live && !active && 'font-semibold text-nirgreen-dark',
                      )}
                    >
                      {item.label}
                      {item.live && <LiveChallengeMark label={liveLabel} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden shrink-0 lg:block">
            {generalSubmissionOpen && (
            <Link
              href="/submit"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-nirgreen-deep px-[18px] py-[9px] text-sm font-semibold text-white transition hover:bg-nirgreen-dark"
            >
              {t('nav.submit')}
            </Link>
            )}
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            className="focus-ring ml-auto rounded-md p-2 text-navy lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t('common.menu')}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>

        {open && (
          <nav id="mobile-nav" aria-label={t('common.mainNav')} className="border-t border-greenline bg-white lg:hidden">
            <div className="container-page flex flex-col gap-1 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    'focus-ring flex items-center rounded-md px-2 py-2.5 text-sm font-medium text-navy',
                    item.live && 'bg-nirgreen-deep/5 font-semibold text-nirgreen-dark',
                  )}
                >
                  {item.label}
                  {item.live && (
                    <>
                      <LiveChallengeMark label={liveLabel} />
                      <span className="ml-auto rounded-full bg-nirgreen-deep px-2 py-0.5 text-[11px] font-semibold text-white" aria-hidden>
                        {liveLabel}
                      </span>
                    </>
                  )}
                </Link>
              ))}
              {generalSubmissionOpen && (
              <Link
                href="/submit"
                onClick={() => setOpen(false)}
                className="focus-ring mt-2 rounded-full bg-nirgreen-deep px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                {t('nav.submit')}
              </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
