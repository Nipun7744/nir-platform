'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  ChevronDown,
  FileText,
  Landmark,
  Lock,
  Mail,
  Phone,
  Send,
  Star,
  User,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useChallenge, type ChallengeDto } from '@/hooks/use-content';
import { challengeDaysLeft } from '@/lib/challenge-dates';

type Section = { id: string; title: string; content: React.ReactNode };

/** Plain admin-entered text: keep their line breaks, never interpret HTML. */
function Prose({ text }: { text: string }) {
  return <p className="whitespace-pre-line leading-relaxed text-navy/85">{text}</p>;
}

export default function ChallengeDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const t = useTranslations('challengeDetail');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { data: challenge, isLoading } = useChallenge(slug);

  if (isLoading) return <div className="container-page py-24 text-center text-slate">{tCommon('loading')}</div>;
  if (!challenge) return <div className="container-page py-24 text-center text-slate">{t('notFound')}</div>;

  const bn = locale === 'bn';
  // Bangla site shows the Bn text when the admin wrote one, otherwise falls back to English.
  const pick = (en?: string | null, bnText?: string | null) => (bn && bnText ? bnText : en) || null;
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  const title = pick(challenge.titleEn, challenge.titleBn)!;
  const daysLeft = challenge.status === 'OPEN' ? challengeDaysLeft(challenge.deadline) : null;
  const sections = buildSections(challenge, pick, formatDate, t);
  const hasContact = Boolean(challenge.contactName || challenge.contactEmail || challenge.contactPhone);

  return (
    <div className="container-page pb-32 pt-10 lg:pb-16">
      <Link href="/challenges" className="focus-ring mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> {t('back')}
      </Link>

      {/* ---------------------------------------------------------------- header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-mist-2 px-2.5 py-1 text-xs font-semibold text-nirgreen-deep">
          {t.has(`status.${challenge.status}`) ? t(`status.${challenge.status}`) : challenge.status}
        </span>
        {challenge.isFeatured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber/20 px-2.5 py-1 text-xs font-semibold text-amber-deep">
            <Star className="h-3 w-3 fill-amber text-amber" /> {t('featured')}
          </span>
        )}
        {daysLeft !== null && (
          <span className="inline-flex rounded-full bg-amber/20 px-2.5 py-1 text-xs font-semibold text-amber-deep">
            {t('daysLeft', { count: daysLeft })}
          </span>
        )}
      </div>
      <h1 className="mt-4 max-w-4xl font-display text-3xl font-extrabold text-navy sm:text-4xl">{title}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-slate">
        <Landmark className="h-4 w-4 shrink-0 text-nirgreen-deep" /> {challenge.organizingAgency}
      </p>

      {challenge.bannerImageUrl && (
        <div className="relative mt-6 aspect-video overflow-hidden rounded-xl2 border border-greenline lg:aspect-[21/9]">
          <Image src={challenge.bannerImageUrl} alt="" fill className="object-cover" sizes="(min-width: 1200px) 1150px, 100vw" priority />
        </div>
      )}

      {/* ---------------------------------------------------------------- body */}
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {sections.length > 2 && (
            <nav aria-label={t('onThisPage')} className="mb-8 rounded-xl border border-greenline bg-mist p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">{t('onThisPage')}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="focus-ring inline-flex rounded-full border border-greenline bg-white px-3 py-1 text-sm text-navy hover:border-nirgreen">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="space-y-10">
            {sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-36">
                <h2 id={`${s.id}-h`} className="mb-3 font-display text-xl font-bold text-navy">{s.title}</h2>
                {s.content}
              </section>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------------------- sidebar */}
        <aside className="min-w-0">
          <div className="space-y-4 lg:sticky lg:top-36">
            <div className="rounded-xl2 border border-greenline bg-white p-5 shadow-soft">
              <dl className="space-y-4 text-sm">
                {challenge.deadline && (
                  <div className="flex gap-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-nirgreen-deep" />
                    <div>
                      <dt className="text-xs uppercase tracking-[0.08em] text-slate">{t('dates')}</dt>
                      <dd className="font-medium text-navy">
                        {challenge.startDate && (
                          <span className="block">{t('starts')}: {formatDate(challenge.startDate)}</span>
                        )}
                        <span className="block">{t('deadline')}: {formatDate(challenge.deadline)}</span>
                      </dd>
                    </div>
                  </div>
                )}
                {challenge.prizeInfoEn && (
                  <div className="flex gap-3">
                    <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-nirgreen-deep" />
                    <div>
                      <dt className="text-xs uppercase tracking-[0.08em] text-slate">{t('prize')}</dt>
                      <dd className="font-medium text-navy">{challenge.prizeInfoEn}</dd>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-nirgreen-deep" />
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-[0.08em] text-slate">{t('organizer')}</dt>
                    <dd className="font-medium text-navy">{challenge.organizingAgency}</dd>
                  </div>
                </div>
              </dl>

              <div className="mt-5 border-t border-greenline pt-5">
                <SubmitBlock challenge={challenge} t={t} />
              </div>
            </div>

            {hasContact && (
              <div className="rounded-xl2 border border-greenline bg-white p-5">
                <h2 className="font-display text-base font-bold text-navy">{t('contact')}</h2>
                <ul className="mt-3 space-y-2 text-sm text-navy">
                  {challenge.contactName && (
                    <li className="flex items-center gap-2"><User className="h-4 w-4 shrink-0 text-slate" /> {challenge.contactName}</li>
                  )}
                  {challenge.contactEmail && (
                    <li className="flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-slate" />
                      <a href={`mailto:${challenge.contactEmail}`} className="focus-ring min-w-0 truncate text-nirgreen-deep hover:underline">
                        {challenge.contactEmail}
                      </a>
                    </li>
                  )}
                  {challenge.contactPhone && (
                    <li className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-slate" />
                      <a href={`tel:${challenge.contactPhone.replace(/[^\d+]/g, '')}`} className="focus-ring text-nirgreen-deep hover:underline">
                        {challenge.contactPhone}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile: keep the call to action in reach while reading a long page. */}
      {challenge.acceptingSubmissions && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-greenline bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            {daysLeft !== null ? (
              <span className="text-sm font-semibold text-amber-deep">{t('daysLeft', { count: daysLeft })}</span>
            ) : (
              <span />
            )}
            <Link
              href={`/challenges/${challenge.slug}/submit`}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-nirgreen-deep px-5 py-2.5 text-sm font-semibold text-white hover:bg-nirgreen-dark"
            >
              <Send className="h-4 w-4" /> {t('submit')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitBlock({ challenge, t }: { challenge: ChallengeDto; t: ReturnType<typeof useTranslations<'challengeDetail'>> }) {
  if (challenge.acceptingSubmissions) {
    return (
      <>
        <Link
          href={`/challenges/${challenge.slug}/submit`}
          className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-full bg-nirgreen-deep px-5 py-3 text-sm font-semibold text-white transition hover:bg-nirgreen-dark"
        >
          <Send className="h-4 w-4" /> {t('submit')}
        </Link>
        <p className="mt-2 text-center text-xs text-slate">{t('signInNote')}</p>
      </>
    );
  }
  return (
    <div className="flex items-start gap-2 text-sm text-slate">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{challenge.closedReason ?? t('notAccepting')}</p>
    </div>
  );
}

function buildSections(
  c: ChallengeDto,
  pick: (en?: string | null, bn?: string | null) => string | null,
  formatDate: (v: string) => string,
  t: ReturnType<typeof useTranslations<'challengeDetail'>>,
): Section[] {
  const sections: Section[] = [];
  const text = (id: string, title: string, value: string | null) => {
    if (value) sections.push({ id, title, content: <Prose text={value} /> });
  };

  text('overview', t('overview'), pick(c.descriptionEn, c.descriptionBn));
  text('problem', t('problemStatement'), pick(c.problemStatementEn, c.problemStatementBn));
  text('eligibility', t('eligibility'), pick(c.eligibilityEn, c.eligibilityBn));

  const phases = c.timelinePhases ?? [];
  if (phases.length) {
    const today = new Date().toISOString().slice(0, 10);
    sections.push({
      id: 'timeline',
      title: t('timeline'),
      content: (
        <ol className="relative ml-2 border-l-2 border-greenline">
          {phases.map((p, i) => {
            const past = Boolean(p.date && p.date < today);
            return (
              <li key={i} className="relative pb-6 pl-6 last:pb-0">
                <span
                  className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${past ? 'bg-greenline' : 'bg-nirgreen-deep'}`}
                  aria-hidden
                />
                {p.date && <p className="font-mono text-xs font-medium uppercase text-slate">{formatDate(p.date)}</p>}
                <p className={`font-semibold ${past ? 'text-slate' : 'text-navy'}`}>{p.label}</p>
                {p.description && <p className="mt-1 whitespace-pre-line text-sm text-slate">{p.description}</p>}
              </li>
            );
          })}
        </ol>
      ),
    });
  }

  text('evaluation', t('evaluationCriteria'), pick(c.evaluationCriteriaEn, c.evaluationCriteriaBn));

  const prizeDetails = pick(c.prizeDetailsEn, c.prizeDetailsBn);
  if (prizeDetails || c.prizeInfoEn) {
    sections.push({
      id: 'prizes',
      title: t('prizes'),
      content: (
        <div className="space-y-3">
          {c.prizeInfoEn && (
            <p className="inline-flex items-center gap-2 rounded-lg bg-mist px-3 py-2 font-semibold text-navy">
              <Banknote className="h-4 w-4 text-nirgreen-deep" /> {c.prizeInfoEn}
            </p>
          )}
          {prizeDetails && <Prose text={prizeDetails} />}
        </div>
      ),
    });
  }

  const resources = c.resources ?? [];
  if (resources.length) {
    sections.push({
      id: 'resources',
      title: t('resources'),
      content: (
        <ul className="space-y-2">
          {resources.map((r, i) => (
            <li key={i}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring flex items-center gap-3 rounded-lg border border-greenline bg-white px-4 py-3 text-sm font-medium text-navy hover:border-nirgreen"
              >
                <FileText className="h-4 w-4 shrink-0 text-nirgreen-deep" />
                <span className="min-w-0 truncate">{r.label}</span>
              </a>
            </li>
          ))}
        </ul>
      ),
    });
  }

  const faqs = c.faqs ?? [];
  if (faqs.length) {
    sections.push({
      id: 'faq',
      title: t('faq'),
      content: (
        <div className="divide-y divide-greenline rounded-xl border border-greenline bg-white">
          {faqs.map((f, i) => (
            <details key={i} className="group px-4 py-3">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-navy [&::-webkit-details-marker]:hidden">
                {f.question}
                <ChevronDown className="h-4 w-4 shrink-0 text-slate transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate">{f.answer}</p>
            </details>
          ))}
        </div>
      ),
    });
  }

  text('more', t('additionalInfo'), pick(c.additionalInfoEn, c.additionalInfoBn));
  return sections;
}
