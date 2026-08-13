'use client';

import { Link } from '@/i18n/navigation';
import { Role } from '@nir/shared';
import { useAuthStore } from '@/store/auth-store';
import { useCurrentUser } from '@/hooks/use-auth';
import {
  Lightbulb, ClipboardCheck, ShieldCheck, Landmark, Users2, Briefcase, Building, LineChart, Workflow, ArrowRight, ListChecks, SearchCheck,
} from 'lucide-react';

const ROLE_CARDS: Record<string, { icon: any; title: string; desc: string; href: string }> = {
  [Role.INNOVATION_SUBMITTER]: { icon: Lightbulb, title: 'Submit & track innovations', desc: 'Start a new submission or check the review status of your ideas.', href: '/dashboard/innovations' },
  [Role.PRELIMINARY_REVIEWER]: { icon: ListChecks, title: 'Screen new submissions', desc: 'Shortlist or reject incoming innovations before authenticity review.', href: '/dashboard/preliminary-review' },
  [Role.AUTHENTICITY_REVIEWER]: { icon: SearchCheck, title: 'Verify submissions', desc: 'Confirm innovations are authentic, original, and not duplicates before they reach evaluators.', href: '/dashboard/authenticity-review' },
  [Role.EXPERT_EVALUATOR]: { icon: ClipboardCheck, title: 'Evaluate assigned innovations', desc: 'Score submissions, leave feedback, and flag IP concerns.', href: '/dashboard/evaluations' },
  [Role.INSTITUTIONAL_COORDINATOR]: { icon: ShieldCheck, title: 'Moderate submissions', desc: 'Assign evaluators and move innovations through the review pipeline.', href: '/dashboard/moderation' },
  [Role.INVESTOR]: { icon: Briefcase, title: 'Discover fundable innovations', desc: 'Browse published innovations and express interest.', href: '/dashboard/investor' },
  [Role.MENTOR]: { icon: Users2, title: 'Mentor innovators', desc: 'Manage matches, schedule sessions, and log activity.', href: '/dashboard/mentor' },
  [Role.MINISTRY_FOCAL_POINT]: { icon: Landmark, title: 'Ministry annual submissions', desc: 'Submit and validate your ministry’s yearly innovations.', href: '/dashboard/ministry' },
  [Role.INNOVATION_MANAGER]: { icon: Workflow, title: 'Track the innovation pipeline', desc: 'Move innovations through stages and record fund disbursements.', href: '/dashboard/pipeline' },
  [Role.POLICY_OBSERVER]: { icon: LineChart, title: 'Reports & KPIs', desc: 'Review fund utilization, service analytics, and export reports.', href: '/dashboard/reports' },
  [Role.PLATFORM_ADMIN]: { icon: Building, title: 'Platform administration', desc: 'Manage users, roles, categories, and moderation.', href: '/dashboard/admin' },
  [Role.SYSTEM_ADMIN]: { icon: Building, title: 'System administration', desc: 'Manage users and platform configuration.', href: '/dashboard/admin' },
};

export default function DashboardOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useCurrentUser() as { data?: { fullName: string } };
  if (!user) return null;

  const cards = Array.from(new Set(user.roles)).map((r) => ROLE_CARDS[r]).filter(Boolean);
  const displayName = profile?.fullName ?? user.fullName;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Welcome back, {displayName.split(' ')[0]}</h1>
      <p className="mt-1 text-ink-600">Here's what you can do with your account today.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {cards.map((card, i) => (
          <Link
            key={i}
            href={card.href}
            className="focus-ring group flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <card.icon className="h-5 w-5" />
            </span>
            <h2 className="font-display text-base font-bold text-ink-900">{card.title}</h2>
            <p className="text-sm text-ink-600">{card.desc}</p>
            <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-brand-700">
              Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
