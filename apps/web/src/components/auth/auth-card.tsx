'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

/**
 * Card shell for the sign-in / registration screens.
 *
 * Accessibility (2026-11-17, WCAG 2.2 AA):
 *  - `focusHeading`: when the card replaces other content without a page load (e.g. "account
 *    created", or back from the code step), focus moves to the <h1> so keyboard and screen-reader
 *    users land at the start of the new content instead of on <body> (2.4.3, 4.1.3).
 *  - The subtitle has a stable id (`auth-card-subtitle`) so a field can reference it with
 *    aria-describedby (the code step's "we sent a code to …").
 *  - The logo is decorative here — the <h1> right below already names the site — so alt="".
 */
export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
  focusHeading = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  focusHeading?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading, title]);

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-8 sm:py-14">
      <div className="w-full max-w-md rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-8">
        <div className="mb-6">
          <Image src="/brand/nir-logo.svg" alt="" width={180} height={60} className="h-12 w-auto sm:h-14" />
        </div>
        {eyebrow && <p className="font-mono text-xs font-semibold uppercase tracking-wide text-brand-700">{eyebrow}</p>}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-1.5 scroll-mt-36 font-display text-2xl font-extrabold text-ink-900 outline-none"
        >
          {title}
        </h1>
        <p id="auth-card-subtitle" className="mt-1.5 text-sm text-ink-600">
          {subtitle}
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
