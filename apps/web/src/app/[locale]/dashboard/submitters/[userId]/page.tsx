'use client';

import { useParams } from 'next/navigation';
import { Mail, Phone, Building2, User as UserIcon, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useSubmitterProfile } from '@/hooks/use-submitter-profile';

export default function SubmitterProfilePage() {
  const user = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const { data: profile, isLoading, isError } = useSubmitterProfile(params.userId) as {
    data?: any;
    isLoading: boolean;
    isError: boolean;
  };

  if (!user) return <div className="container-page py-24 text-center text-ink-400">Checking your session…</div>;
  if (isLoading) return <p className="text-ink-400">Loading…</p>;

  if (isError || !profile) {
    return (
      <div className="max-w-xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="focus-ring mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto h-8 w-8 text-ink-300" />
          <p className="mt-3 text-sm text-ink-600">
            You don't have permission to view this profile, or it doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  const subtitle = [profile.designation, profile.institution].filter(Boolean).join(', ');

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => router.back()}
        className="focus-ring mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="font-display text-2xl font-extrabold text-ink-900">Submitter profile</h1>
      <p className="mt-1 text-ink-600">Visible to Preliminary Reviewers, Expert Evaluators, and administrators only.</p>

      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-full border border-ink-100 object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-300">
              <UserIcon className="h-7 w-7" />
            </span>
          )}
          <div>
            <p className="font-display text-lg font-bold text-ink-900">{profile.fullName}</p>
            {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
          </div>
        </div>

        <dl className="mt-5 space-y-2.5 border-t border-ink-100 pt-5 text-sm">
          <div className="flex items-center gap-2 text-ink-700">
            <Mail className="h-4 w-4 text-brand-600" /> {profile.email}
          </div>
          {profile.phone && (
            <div className="flex items-center gap-2 text-ink-700">
              <Phone className="h-4 w-4 text-brand-600" /> {profile.phone}
            </div>
          )}
          {profile.innovatorProfile?.organization?.name && (
            <div className="flex items-center gap-2 text-ink-700">
              <Building2 className="h-4 w-4 text-brand-600" /> {profile.innovatorProfile.organization.name}
            </div>
          )}
        </dl>

        {profile.innovatorProfile?.irn && (
          <p className="mt-4 font-mono text-xs text-ink-400">
            {profile.innovatorProfile.irn}
            {profile.innovatorProfile.nidVerified ? ' · NID verified' : ''}
          </p>
        )}

        {profile.innovatorProfile?.bio && (
          <p className="mt-4 text-sm leading-relaxed text-ink-700">{profile.innovatorProfile.bio}</p>
        )}
      </div>
    </div>
  );
}
