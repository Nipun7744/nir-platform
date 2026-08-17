'use client';

import { usePathname, Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard, Lightbulb, ClipboardCheck, ShieldCheck, Landmark, Users2, Briefcase,
  Building, LineChart, LogOut, Workflow, UserCheck, UserCog, User as UserIcon, ListChecks, SearchCheck,
  Layers,
} from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useLogout, useCurrentUser } from '@/hooks/use-auth';
import { usePendingUsers } from '@/hooks/use-admin';
import { useCategories } from '@/hooks/use-content';
import { ROLE_LABELS, Role } from '@nir/shared';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}

const ADMIN_ROLES = [Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN];

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/innovations', label: 'My innovations', icon: Lightbulb, roles: [Role.INNOVATION_SUBMITTER] },
  { href: '/dashboard/evaluations', label: 'Evaluations', icon: ClipboardCheck, roles: [Role.EXPERT_EVALUATOR] },
  { href: '/dashboard/preliminary-review', label: 'Preliminary review', icon: ListChecks, roles: [Role.PRELIMINARY_REVIEWER] },
  { href: '/dashboard/authenticity-review', label: 'Authenticity review', icon: SearchCheck, roles: [Role.AUTHENTICITY_REVIEWER] },
  { href: '/dashboard/moderation', label: 'Moderation', icon: ShieldCheck, roles: [Role.INSTITUTIONAL_COORDINATOR] },
  { href: '/dashboard/investor', label: 'Investor', icon: Briefcase, roles: [Role.INVESTOR] },
  { href: '/dashboard/mentor', label: 'Mentorship', icon: Users2, roles: [Role.MENTOR] },
  { href: '/dashboard/ministry', label: 'Ministry submissions', icon: Landmark, roles: [Role.MINISTRY_FOCAL_POINT] },
  { href: '/dashboard/pipeline', label: 'Innovation pipeline', icon: Workflow, roles: [Role.INNOVATION_MANAGER] },
  { href: '/dashboard/reports', label: 'Reports & KPIs', icon: LineChart, roles: [Role.POLICY_OBSERVER, Role.PLATFORM_ADMIN] },
  { href: '/dashboard/admin/evaluations', label: 'Evaluations', icon: ClipboardCheck, roles: ADMIN_ROLES },
  { href: '/dashboard/admin/approvals', label: 'User Approvals', icon: UserCheck, roles: ADMIN_ROLES },
  { href: '/dashboard/admin/repository', label: 'Repository Management', icon: Layers, roles: ADMIN_ROLES },
  { href: '/dashboard/admin', label: 'Platform admin', icon: Building, roles: ADMIN_ROLES },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth();
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const isAdmin = Boolean(user && ADMIN_ROLES.some((r) => user.roles.includes(r)));
  const { data: pendingUsers } = usePendingUsers(isAdmin) as { data?: { total: number } };
  const { data: profile } = useCurrentUser() as { data: any };
  const { data: categories } = useCategories();
  const isEvaluator = Boolean(user?.roles.includes(Role.EXPERT_EVALUATOR));
  const evaluatorCategoryNames = (profile?.evaluatorCategoryIds ?? [])
    .map((id: string) => categories?.find((c) => c.id === id)?.nameEn)
    .filter(Boolean);
  const isPreliminaryReviewer = Boolean(user?.roles.includes(Role.PRELIMINARY_REVIEWER));
  const preliminaryReviewCategoryNames = (profile?.preliminaryReviewerCategoryIds ?? [])
    .map((id: string) => categories?.find((c) => c.id === id)?.nameEn)
    .filter(Boolean);
  const isAuthenticityReviewer = Boolean(user?.roles.includes(Role.AUTHENTICITY_REVIEWER));
  const authenticityReviewCategoryNames = (profile?.authenticityReviewerCategoryIds ?? [])
    .map((id: string) => categories?.find((c) => c.id === id)?.nameEn)
    .filter(Boolean);
  const isInnovator = Boolean(user?.roles.includes(Role.INNOVATION_SUBMITTER));
  const innovatorProfile = profile?.innovatorProfile;

  if (!user) {
    return <div className="container-page py-24 text-center text-ink-400">Checking your session…</div>;
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.some((r) => user.roles.includes(r)));
  const pendingCount = pendingUsers?.total ?? 0;

  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-6">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
          <div className="flex items-start gap-3">
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full border border-ink-100 object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-ink-50 text-ink-300">
                <UserIcon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-sm font-bold text-ink-900">{profile?.fullName ?? user.fullName}</p>
                <Link
                  href="/dashboard/profile"
                  className="focus-ring flex shrink-0 items-center gap-1 text-[11px] font-semibold text-ink-400 hover:text-brand-700"
                >
                  <UserCog className="h-3.5 w-3.5" /> Edit
                </Link>
              </div>
            </div>
          </div>
          {(profile?.designation || profile?.institution) && (
            <p className="mt-0.5 text-xs text-ink-500">
              {[profile?.designation, profile?.institution].filter(Boolean).join(', ')}
            </p>
          )}
          <p className="mt-0.5 truncate text-xs text-ink-500">{user.email}</p>
          {profile?.phone && <p className="text-xs text-ink-500">{profile.phone}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <span key={r} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                {ROLE_LABELS[r]}
              </span>
            ))}
          </div>
          {isEvaluator && (
            <div className="mt-2 border-t border-ink-100 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Evaluation categories</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {evaluatorCategoryNames.length ? (
                  evaluatorCategoryNames.map((name: string) => (
                    <span key={name} className="rounded-full bg-clay-50 px-2 py-0.5 text-[10px] font-semibold text-clay-700">
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-ink-400">Not assigned yet</span>
                )}
              </div>
            </div>
          )}
          {isPreliminaryReviewer && (
            <div className="mt-2 border-t border-ink-100 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Review categories</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {preliminaryReviewCategoryNames.length ? (
                  preliminaryReviewCategoryNames.map((name: string) => (
                    <span key={name} className="rounded-full bg-clay-50 px-2 py-0.5 text-[10px] font-semibold text-clay-700">
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-ink-400">Not assigned yet</span>
                )}
              </div>
            </div>
          )}
          {isAuthenticityReviewer && (
            <div className="mt-2 border-t border-ink-100 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Review categories</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {authenticityReviewCategoryNames.length ? (
                  authenticityReviewCategoryNames.map((name: string) => (
                    <span key={name} className="rounded-full bg-clay-50 px-2 py-0.5 text-[10px] font-semibold text-clay-700">
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-ink-400">Not assigned yet</span>
                )}
              </div>
            </div>
          )}
          {isInnovator && innovatorProfile && (
            <div className="mt-2 border-t border-ink-100 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Innovator details</p>
              <p className="mt-1 font-mono text-[11px] text-ink-600">{innovatorProfile.irn}</p>
              {innovatorProfile.organization?.name && (
                <p className="text-[11px] text-ink-500">{innovatorProfile.organization.name}</p>
              )}
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  innovatorProfile.nidVerified ? 'bg-brand-50 text-brand-700' : 'bg-sun-100 text-sun-600'
                }`}
              >
                {innovatorProfile.nidVerified ? 'NID verified' : 'NID verification pending'}
              </span>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.href === '/dashboard/admin/approvals' && pendingCount > 0 && (
                  <span className={clsx(
                    'ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700',
                  )}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            onClick={async () => {
              await logout.mutateAsync();
              router.push('/');
            }}
            className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </nav>
      </aside>

      <main>{children}</main>
    </div>
  );
}
