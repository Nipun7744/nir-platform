import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Target, Compass, ListChecks, Landmark } from 'lucide-react';

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const objectives = t.raw('objectives') as string[];

  return (
    <div className="container-page max-w-3xl py-14">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{t('eyebrow')}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">{t('title')}</h1>
      <p className="mt-5 leading-relaxed text-ink-700">{t('description')}</p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-brand-50/50 p-6">
          <Compass className="h-6 w-6 text-brand-700" />
          <h2 className="mt-3 font-display text-lg font-bold text-ink-900">{t('visionLabel')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{t('vision')}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-sun-50/60 p-6">
          <Target className="h-6 w-6 text-sun-600" />
          <h2 className="mt-3 font-display text-lg font-bold text-ink-900">{t('missionLabel')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{t('mission')}</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900">
          <ListChecks className="h-5 w-5 text-brand-700" /> {t('objectivesLabel')}
        </h2>
        <ul className="mt-4 space-y-2.5">
          {objectives.map((o) => (
            <li key={o} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              {o}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 rounded-2xl border border-ink-100 bg-ink-900 p-6 text-ink-50">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
          <Landmark className="h-5 w-5 text-brand-300" /> {t('governanceLabel')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-100/80">{t('governance')}</p>
      </div>
    </div>
  );
}
