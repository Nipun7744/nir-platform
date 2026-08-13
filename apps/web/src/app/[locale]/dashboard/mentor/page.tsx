'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import {
  useMyMentorMatches,
  useMyMentorSessions,
  useUpdateSessionStatus,
  useLogMentorActivity,
  useMyMentorActivityLogs,
} from '@/hooks/use-mentorship';

const SESSION_STYLES: Record<string, string> = {
  PROPOSED: 'bg-sun-100 text-sun-600',
  CONFIRMED: 'bg-brand-100 text-brand-700',
  COMPLETED: 'bg-ink-50 text-ink-500',
  CANCELLED: 'bg-red-50 text-red-600',
};

export default function MentorDashboardPage() {
  const { data: matches } = useMyMentorMatches() as { data: any[] };
  const { data: sessions } = useMyMentorSessions() as { data: any[] };
  const { data: logs } = useMyMentorActivityLogs() as { data: any[] };
  const updateStatus = useUpdateSessionStatus();
  const logActivity = useLogMentorActivity();
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Mentor dashboard</h1>
      <p className="mt-1 text-ink-600">Your matched innovations, mentorship sessions, and logged activity.</p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-ink-900">Matched innovations</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {matches?.map((m) => (
            <Link key={m.id} href={`/repository/${m.innovation.slug}`} className="focus-ring rounded-2xl border border-ink-100 bg-white p-4 shadow-card hover:border-brand-300">
              <p className="font-mono text-[11px] text-ink-400">{m.innovation.innovationCode}</p>
              <p className="font-medium text-ink-800">{m.innovation.titleEn}</p>
            </Link>
          ))}
          {matches?.length === 0 && <p className="text-ink-400">No matches yet — an admin will pair you with an innovation.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-bold text-ink-900">Mentorship sessions</h2>
        <div className="mt-3 space-y-3">
          {sessions?.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <div>
                <p className="text-sm font-medium text-ink-800">{new Date(s.scheduledAt).toLocaleString()}</p>
                <p className="text-xs text-ink-500">{s.mode}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SESSION_STYLES[s.status]}`}>{s.status}</span>
                {s.status === 'PROPOSED' && (
                  <button onClick={() => updateStatus.mutate({ id: s.id, status: 'CONFIRMED' })} className="focus-ring rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:border-brand-300">
                    Confirm
                  </button>
                )}
                {s.status === 'CONFIRMED' && (
                  <button onClick={() => updateStatus.mutate({ id: s.id, status: 'COMPLETED' })} className="focus-ring rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:border-brand-300">
                    Mark completed
                  </button>
                )}
              </div>
            </div>
          ))}
          {sessions?.length === 0 && <p className="text-ink-400">No sessions scheduled yet.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-bold text-ink-900">Log mentoring hours</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input type="number" step="0.5" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} className="focus-ring w-28 rounded-lg border border-ink-100 px-3 py-2 text-sm" />
          <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="focus-ring flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm" />
          <button
            disabled={!hours || logActivity.isPending}
            onClick={() => {
              logActivity.mutate({ hours: Number(hours), description });
              setHours('');
              setDescription('');
            }}
            className="focus-ring rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Log
          </button>
        </div>
        <div className="mt-4 space-y-1.5">
          {logs?.map((log) => (
            <p key={log.id} className="text-sm text-ink-600">
              {new Date(log.loggedAt).toLocaleDateString()} — {log.hours}h {log.description && `· ${log.description}`}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
