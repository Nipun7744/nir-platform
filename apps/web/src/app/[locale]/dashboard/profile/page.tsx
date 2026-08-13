'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, User as UserIcon } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useCurrentUser, useUpdateMyProfile } from '@/hooks/use-auth';
import { useUploadFile } from '@/hooks/use-admin';
import { useCategories } from '@/hooks/use-content';
import { ApiError } from '@/lib/api-client';
import { Role } from '@nir/shared';

const inputCls = 'focus-ring w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm';

function ColorfulSpinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block ${className} animate-spin rounded-full border-2 border-t-brand-500 border-r-sun-500 border-b-clay-500 border-l-transparent`}
    />
  );
}

function AvatarUploader({ avatarUrl }: { avatarUrl: string | null }) {
  const upload = useUploadFile();
  const updateProfile = useUpdateMyProfile();

  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="Profile" className="h-16 w-16 rounded-full border border-ink-100 object-cover" />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-300">
          <UserIcon className="h-7 w-7" />
        </span>
      )}
      <div>
        <label className="focus-ring inline-block cursor-pointer rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:border-ink-300">
          {upload.isPending ? 'Uploading…' : 'Change photo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              upload.mutate(file, {
                onSuccess: (data) => updateProfile.mutate({ avatarUrl: data.url }),
              });
              e.target.value = '';
            }}
          />
        </label>
        {upload.isError && <p className="mt-1 text-xs text-red-600">Upload failed — try a smaller image.</p>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading } = useCurrentUser() as { data: any; isLoading: boolean };
  const { data: categories } = useCategories();
  const updateProfile = useUpdateMyProfile();
  const categoryUpdate = useUpdateMyProfile();

  const [form, setForm] = useState({ fullName: '', phone: '', designation: '', institution: '' });

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? '',
      phone: profile.phone ?? '',
      designation: profile.designation ?? '',
      institution: profile.institution ?? '',
    });
  }, [profile]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const isEvaluator = Boolean(profile?.roles?.includes(Role.EXPERT_EVALUATOR));
  const categoryIds: string[] = profile?.evaluatorCategoryIds ?? [];
  const isInnovator = Boolean(profile?.roles?.includes(Role.INNOVATION_SUBMITTER));
  const innovatorProfile = profile?.innovatorProfile;

  const toggleCategory = (categoryId: string) => {
    const next = categoryIds.includes(categoryId)
      ? categoryIds.filter((id) => id !== categoryId)
      : [...categoryIds, categoryId];
    categoryUpdate.mutate({ categoryIds: next });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      {
        fullName: form.fullName,
        phone: form.phone || undefined,
        designation: form.designation || undefined,
        institution: form.institution || undefined,
      },
      { onSuccess: () => router.push('/dashboard') },
    );
  };

  if (isLoading) return <p className="text-ink-400">Loading…</p>;

  return (
    <div className="max-w-xl">
      <Link href="/dashboard" className="focus-ring mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <h1 className="font-display text-2xl font-extrabold text-ink-900">Edit profile</h1>
      <p className="mt-1 text-ink-600">Keep your contact and professional details up to date.</p>

      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <AvatarUploader avatarUrl={profile?.avatarUrl ?? null} />
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Full name</label>
          <input required value={form.fullName} onChange={set('fullName')} className={inputCls} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Email</label>
          <input value={profile?.email ?? ''} disabled className={`${inputCls} bg-ink-50 text-ink-400`} />
          <p className="mt-1 text-xs text-ink-400">Email can't be changed here — contact an administrator if needed.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Phone</label>
          <input value={form.phone} onChange={set('phone')} placeholder="e.g. +8801XXXXXXXXX" className={inputCls} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Designation</label>
            <input value={form.designation} onChange={set('designation')} placeholder="e.g. Professor, Dept. of CSE" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Institution</label>
            <input value={form.institution} onChange={set('institution')} placeholder="e.g. BUET" className={inputCls} />
          </div>
        </div>

        {updateProfile.isError && (
          <p className="text-sm text-red-600">
            {updateProfile.error instanceof ApiError ? updateProfile.error.message : 'Something went wrong'}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="focus-ring flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {updateProfile.isPending && <ColorfulSpinner />}
            {updateProfile.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {isEvaluator && (
        <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <label className="mb-1 block text-sm font-medium text-ink-700">Evaluation categories</label>
          <p className="mb-3 text-xs text-ink-500">
            Innovations submitted in these categories are automatically added to your "Assigned to me" list.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categories?.map((c) => {
              const active = categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-500 hover:border-ink-300'
                  }`}
                >
                  {c.nameEn}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isInnovator && innovatorProfile && (
        <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <label className="mb-1 block text-sm font-medium text-ink-700">Innovator details</label>
          <p className="mb-3 text-xs text-ink-500">
            Assigned when you registered — contact an administrator to update your organization or NID verification.
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-500">Innovator Recognition Number</dt>
              <dd className="font-mono text-xs text-ink-800">{innovatorProfile.irn}</dd>
            </div>
            {innovatorProfile.organization?.name && (
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Organization</dt>
                <dd className="text-ink-800">{innovatorProfile.organization.name}</dd>
              </div>
            )}
            <div className="flex items-center justify-between">
              <dt className="text-ink-500">NID status</dt>
              <dd>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    innovatorProfile.nidVerified ? 'bg-brand-50 text-brand-700' : 'bg-sun-100 text-sun-600'
                  }`}
                >
                  {innovatorProfile.nidVerified ? 'Verified' : 'Pending'}
                </span>
              </dd>
            </div>
            {innovatorProfile.bio && (
              <div>
                <dt className="text-ink-500">Bio</dt>
                <dd className="mt-1 text-ink-700">{innovatorProfile.bio}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
