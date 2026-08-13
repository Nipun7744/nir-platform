import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function SiteFooter() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy text-[#B9C7DE]">
      <div className="container-page grid grid-cols-1 gap-12 py-16 pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Image src="/brand/nir-logo.svg" alt="National Innovation Repository" width={180} height={60} className="h-[52px] w-auto rounded-[10px] bg-white px-2.5 py-1.5" />
          <p className="mt-4 max-w-[34ch] text-sm leading-relaxed">{t('tagline')}</p>
        </div>

        <div>
          <h3 className="mb-4 text-base font-semibold text-white">{t('explore')}</h3>
          <ul className="grid list-none gap-2.5 p-0 text-sm">
            <li><Link href="/repository" className="text-[#E4EBF5] no-underline hover:underline">{tNav('repository')}</Link></li>
            <li><Link href="/challenges" className="text-[#E4EBF5] no-underline hover:underline">{tNav('challenges')}</Link></li>
            <li><Link href="/statistics" className="text-[#E4EBF5] no-underline hover:underline">{tNav('statistics')}</Link></li>
            <li><Link href="/news" className="text-[#E4EBF5] no-underline hover:underline">{t('successStories')}</Link></li>
            <li><Link href="/faq" className="text-[#E4EBF5] no-underline hover:underline">{tNav('faq')}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-base font-semibold text-white">{t('participate')}</h3>
          <ul className="grid list-none gap-2.5 p-0 text-sm">
            <li><Link href="/submit" className="text-[#E4EBF5] no-underline hover:underline">{tNav('submit')}</Link></li>
            <li><Link href="/register?role=mentor" className="text-[#E4EBF5] no-underline hover:underline">{t('registerInnovator')}</Link></li>
            <li><Link href="/register?role=investor" className="text-[#E4EBF5] no-underline hover:underline">{t('registerInvestor')}</Link></li>
            <li><Link href="/register?role=ministry" className="text-[#E4EBF5] no-underline hover:underline">{t('ministryPortal')}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-base font-semibold text-white">{t('contact')}</h3>
          <ul className="grid list-none gap-2.5 p-0 text-sm">
            <li>Aspire to Innovate (a2i) Programme</li>
            <li>E-14/X, ICT Tower, Agargaon,<br />Sher-e-Bangla Nagar, Dhaka-1207</li>
            <li>Phone: +88 02 55006931-34</li>
            <li><a href="mailto:info@a2i.gov.bd" className="text-[#E4EBF5] no-underline hover:underline">info@a2i.gov.bd</a></li>
          </ul>
        </div>
      </div>

      <div className="container-page flex flex-wrap items-center justify-between gap-4 border-t border-navy-line py-5 text-xs">
        <span>© {year} {t('rights')}</span>
        <span className="flex gap-1">
          <span className="hover:underline">{t('privacy')}</span> · <span className="hover:underline">{t('terms')}</span> · <span className="hover:underline">{t('accessibility')}</span>
        </span>
      </div>
    </footer>
  );
}
