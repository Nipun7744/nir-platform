'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useUpdateInnovationStatus } from '@/hooks/use-innovations';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/** Statuses an admin can publish from: first publish after approval, or re-publish after a takedown. */
export const PUBLISHABLE_STATUSES = new Set(['APPROVED', 'UNPUBLISHED']);

/**
 * Publish action for an approved (or unpublished) innovation, used on the Admin Evaluations list
 * and detail pages. Same call as the Repository Management page's Publish button
 * (`PATCH /innovations/:id/status` → PUBLISHED), behind the same confirmation step. Renders nothing
 * for any other status.
 */
export function PublishInnovationButton({
  innovation,
  size = 'md',
}: {
  innovation: { id: string; reviewStatus: string };
  size?: 'sm' | 'md';
}) {
  const updateStatus = useUpdateInnovationStatus(innovation.id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!PUBLISHABLE_STATUSES.has(innovation.reviewStatus)) return null;

  const isRepublish = innovation.reviewStatus === 'UNPUBLISHED';

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={updateStatus.isPending}
        className={`focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:opacity-60 ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm'
        }`}
      >
        <Globe className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {updateStatus.isPending ? 'Publishing…' : isRepublish ? 'Republish' : 'Publish'}
      </button>
      {updateStatus.isError && (
        <p className="mt-1 text-xs text-red-600">
          {(updateStatus.error as any)?.message ?? 'Failed to publish.'}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Publish this innovation?"
        description={
          isRepublish
            ? 'This innovation will become visible again on the public repository.'
            : 'This innovation will go live on the public repository for the first time.'
        }
        confirmLabel={isRepublish ? 'Republish' : 'Publish'}
        danger={false}
        pending={updateStatus.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await updateStatus.mutateAsync({ reviewStatus: 'PUBLISHED' });
          } catch {
            // Shown inline via updateStatus.isError above.
          }
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
