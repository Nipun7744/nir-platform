import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { GeneralSubmitGate } from './general-submit-gate';

export function SiteFooter() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const year = new Date().getFullYear();
  // Accessibility (2026-11-17), nothing visible changes: the column titles are h2 (they were h3
  // with no h2 above them), the link columns are named <nav>s, links get a focus ring on the navy
  // background (white ring + navy offset), and the English-only contact block is marked lang="en".
  const link =
    'rounded-sm text-[#E4EBF5] no-underline outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy';

  return (
    <footer className="bg-navy text-[#B9C7DE]">
      <div className="container-page grid grid-cols-1 gap-12 py-16 pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Image lang={locale === 'en' ? undefined : 'en'} src="/brand/nir-logo.svg" alt="National Innovation Repository" width={180} height={60} className="h-[52px] w-auto rounded-[10px] bg-white px-2.5 py-1.5" />
          <p className="mt-4 max-w-[34ch] text-sm leading-relaxed">{t('tagline')}</p>
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className="mb-4 text-base font-semibold text-white">{t('explore')}</h2>
          <ul className="grid list-none gap-2.5 p-0 text-sm">
            <li><Link href="/repository" className={link}>{tNav('repository')}</Link></li>
            <li><Link href="/challenges" className={link}>{tNav('challenges')}</Link></li>
            <li><Link href="/statistics" className={link}>{tNav('statistics')}</Link></li>
            <li><Link href="/news" className={link}>{t('successStories')}</Link></li>
            <li><Link href="/faq" className={link}>{tNav('faq')}</Link></li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-participate">
          <h2 id="footer-participate" className="mb-4 text-base font-semibold text-white">{t('participate')}</h2>
          <ul className="grid list-none gap-2.5 p-0 text-sm">
            <GeneralSubmitGate>
              <li><Link href="/submit" className={link}>{tNav('submit')}</Link></li>
            </GeneralSubmitGate>
            <li><Link href="/challenges" className={link}>{tNav('challenges')}</Link></li>
            <li><Link href="/register?role=mentor" className={link}>{t('registerInnovator')}</Link></li>
            <li><Link href="/register?role=investor" className={link}>{t('registerInvestor')}</Link></li>
            <li><Link href="/register?role=ministry" className={link}>{t('ministryPortal')}</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="mb-4 text-base font-semibold text-white">{t('contact')}</h2>
          <ul className="grid list-none gap-2.5 p-0 text-sm" lang={locale === 'en' ? undefined : 'en'}>
            <li>Aspire to Innovate (a2i) Programme</li>
            <li>E-14/X, ICT Tower, Agargaon,<br />Sher-e-Bangla Nagar, Dhaka-1207</li>
            <li>Phone: +88 02 55006931-34</li>
            <li><a href="mailto:info@a2i.gov.bd" className={link}>info@a2i.gov.bd</a></li>
          </ul>
        </div>
      </div>

      <div className="container-page flex flex-wrap items-center justify-between gap-4 border-t border-navy-line py-5 text-xs">
        <span>© {year} {t('rights')}</span>
        <span className="text-white/80">Version: v0.1.1</span>
        <span className="flex gap-1">
          <span className="hover:underline">{t('privacy')}</span> · <span className="hover:underline">{t('terms')}</span> · <span className="hover:underline">{t('accessibility')}</span>
        </span>
      </div>
    </footer>
  );
}
