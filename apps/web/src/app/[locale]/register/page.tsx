'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { useRegister } from '@/hooks/use-auth';
import { useCategories, useMinistries, useTags } from '@/hooks/use-content';
import { ApiError } from '@/lib/api-client';

type DesiredRole = 'INNOVATION_SUBMITTER' | 'INVESTOR' | 'MENTOR' | 'MINISTRY_FOCAL_POINT';

function ChipSelect({ options, selected, onToggle }: { options: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-500 hover:border-ink-300'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function RegisterPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const register = useRegister();
  const { data: ministries } = useMinistries();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [role, setRole] = useState<DesiredRole>('INNOVATION_SUBMITTER');

  // Investor-only fields
  const [organizationName, setOrganizationName] = useState('');
  const [binNumber, setBinNumber] = useState('');
  const [sectorInterestIds, setSectorInterestIds] = useState<string[]>([]);

  // Mentor-only fields
  const [bio, setBio] = useState('');
  const [availability, setAvailability] = useState('');
  const [expertiseTagIds, setExpertiseTagIds] = useState<string[]>([]);

  // Ministry Focal Point-only fields
  const [ministryId, setMinistryId] = useState('');
  const [title, setTitle] = useState('');

  const toggleId = (list: string[], setList: (next: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Base registration always creates an Innovation Submitter account (every
      // registrant gets an Innovator Recognition Number); the desired self-service
      // role, if any, is layered on server-side in the same call — the account is
      // created inactive and can't authenticate to a separate role-registration
      // call yet, since it still needs an admin's approval.
      await register.mutateAsync({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role: role === 'INNOVATION_SUBMITTER' ? undefined : role,
        organizationName: role === 'INVESTOR' ? organizationName : undefined,
        binNumber: role === 'INVESTOR' ? binNumber || undefined : undefined,
        sectorInterestIds: role === 'INVESTOR' && sectorInterestIds.length ? sectorInterestIds : undefined,
        bio: role === 'MENTOR' ? bio || undefined : undefined,
        availability: role === 'MENTOR' ? availability || undefined : undefined,
        expertiseTagIds: role === 'MENTOR' && expertiseTagIds.length ? expertiseTagIds : undefined,
        ministryId: role === 'MINISTRY_FOCAL_POINT' ? ministryId : undefined,
        title: role === 'MINISTRY_FOCAL_POINT' ? title || undefined : undefined,
      });
    } catch {
      /* surfaced below via register.isError */
    }
  };

  if (register.isSuccess) {
    return (
      <AuthCard title={t('registerTitle')} subtitle={t('registerSubtitle')}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-brand-600" />
          <p className="text-sm text-ink-700">{register.data?.message ?? t('registerPendingBody')}</p>
        </div>
        <p className="mt-6 text-center text-sm text-ink-500">
          <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
            {t('signInInstead')}
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('registerTitle')} subtitle={t('registerSubtitle')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('fullName')}</label>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('email')}</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('phone')}</label>
          <input
            type="tel"
            placeholder="+8801XXXXXXXXX"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('password')}</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">{t('roleLabel')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as DesiredRole)}
            className="focus-ring w-full rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm"
          >
            <option value="INNOVATION_SUBMITTER">{t('roleSubmitter')}</option>
            <option value="INVESTOR">{t('roleInvestor')}</option>
            <option value="MENTOR">{t('roleMentor')}</option>
            <option value="MINISTRY_FOCAL_POINT">{t('roleMinistry')}</option>
          </select>
        </div>

        {role === 'INVESTOR' && (
          <div className="space-y-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('organizationName')}</label>
              <input
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('binNumberLabel')}</label>
              <input
                value={binNumber}
                onChange={(e) => setBinNumber(e.target.value)}
                placeholder={t('binNumberPlaceholder')}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('sectorInterestLabel')}</label>
              <ChipSelect
                options={(categories ?? []).map((c) => ({ id: c.id, label: locale === 'bn' ? c.nameBn : c.nameEn }))}
                selected={sectorInterestIds}
                onToggle={(id) => toggleId(sectorInterestIds, setSectorInterestIds, id)}
              />
            </div>
          </div>
        )}

        {role === 'MENTOR' && (
          <div className="space-y-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('bioLabel')}</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('bioPlaceholder')}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('availabilityLabel')}</label>
              <input
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder={t('availabilityPlaceholder')}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('expertiseLabel')}</label>
              <ChipSelect
                options={(tags ?? []).map((tg) => ({ id: tg.id, label: locale === 'bn' ? tg.nameBn : tg.nameEn }))}
                selected={expertiseTagIds}
                onToggle={(id) => toggleId(expertiseTagIds, setExpertiseTagIds, id)}
              />
            </div>
          </div>
        )}

        {role === 'MINISTRY_FOCAL_POINT' && (
          <div className="space-y-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('ministryLabel')}</label>
              <select
                required
                value={ministryId}
                onChange={(e) => setMinistryId(e.target.value)}
                className="focus-ring w-full rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">{t('ministryPlaceholder')}</option>
                {ministries?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {locale === 'bn' ? m.nameBn : m.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('designationLabel')}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('designationPlaceholder')}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        )}

        {register.isError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {register.error instanceof ApiError ? register.error.message : 'Registration failed'}
          </p>
        )}

        <button
          type="submit"
          disabled={register.isPending}
          className="focus-ring w-full rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {register.isPending ? '…' : t('register')}
        </button>
      </form>

      <SsoButtons />

      <p className="mt-6 text-center text-sm text-ink-500">
        {t('haveAccount')}{' '}
        <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
          {t('signInInstead')}
        </Link>
      </p>
    </AuthCard>
  );
}
