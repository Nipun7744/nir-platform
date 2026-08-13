'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Menu, X } from 'lucide-react';
import { LocaleSwitcher } from './locale-switcher';
import { useAuthStore } from '@/store/auth-store';
import clsx from 'clsx';

export function SiteHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: '/repository', label: t('nav.repository') },
    { href: '/challenges', label: t('nav.challenges') },
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
          <span className="truncate">
            {t('topbar.government')} &nbsp;·&nbsp; {t('topbar.org')}
          </span>
          <div className="flex shrink-0 items-center gap-4">
            <Link href={user ? '/dashboard' : '/sign-in'} className="font-medium text-white hover:underline">
              {user ? t('nav.dashboard') : t('nav.signIn')}
            </Link>
            <LocaleSwitcher />
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="border-b border-greenline bg-white">
        <div className="container-page flex min-h-[76px] items-center gap-8">
          <Link href="/" className="focus-ring shrink-0 rounded-md" aria-label="National Innovation Repository — home">
            <Image src="/brand/nir-logo.svg" alt="National Innovation Repository" width={180} height={60} priority className="h-14 w-auto" />
          </Link>

          <nav aria-label="Main" className="hidden flex-1 lg:block">
            <ul className="flex list-none gap-7 p-0">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'focus-ring inline-block border-b-2 py-2 text-sm font-medium no-underline transition',
                        active ? 'border-nirgreen-deep text-nirgreen-dark' : 'border-transparent text-navy hover:border-nirgreen-deep hover:text-nirgreen-dark',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden shrink-0 lg:block">
            <Link
              href="/submit"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-nirgreen-deep px-[18px] py-[9px] text-sm font-semibold text-white transition hover:bg-nirgreen-dark"
            >
              {t('nav.submit')}
            </Link>
          </div>

          <button
            type="button"
            className="focus-ring ml-auto rounded-md p-2 text-navy lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-greenline bg-white lg:hidden">
            <div className="container-page flex flex-col gap-1 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-md px-2 py-2.5 text-sm font-medium text-navy"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/submit"
                onClick={() => setOpen(false)}
                className="focus-ring mt-2 rounded-full bg-nirgreen-deep px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                {t('nav.submit')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
