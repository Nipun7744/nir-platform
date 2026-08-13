'use client';

import { ROLE_LABELS } from '@nir/shared';
import { CheckCircle2, Clock, X } from 'lucide-react';
import { usePendingUsers, useToggleUserStatus, useRejectUser } from '@/hooks/use-admin';

export default function ApprovalsPage() {
  const { data, isLoading } = usePendingUsers() as { data: any; isLoading: boolean };
  const toggleStatus = useToggleUserStatus();
  const rejectUser = useRejectUser();

  const pending = data?.items ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Account approvals</h1>
      <p className="mt-1 text-ink-600">
        New registrations are held here until an admin approves them — approved accounts can then sign in.
      </p>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {!isLoading && pending.length === 0 && (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-sm text-ink-500">
            <CheckCircle2 className="h-5 w-5 text-brand-600" /> No pending registrations — you're all caught up.
          </div>
        )}
        {pending.map((u: any) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
            <div>
              <p className="font-medium text-ink-800">{u.fullName}</p>
              <p className="text-xs text-ink-500">{u.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {u.roles.map((r: string) => (
                  <span key={r} className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                    {ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                  </span>
                ))}
                <span className="flex items-center gap-1 text-[11px] text-ink-400">
                  <Clock className="h-3 w-3" /> Registered {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                disabled={rejectUser.isPending}
                onClick={() => rejectUser.mutate(u.id)}
                className="focus-ring flex items-center gap-1 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
              >
                <X className="h-4 w-4" /> Reject
              </button>
              <button
                disabled={toggleStatus.isPending}
                onClick={() => toggleStatus.mutate({ id: u.id, isActive: true })}
                className="focus-ring flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
