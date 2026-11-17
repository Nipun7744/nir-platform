import { Role } from '@nir/shared';

/** Statuses an owner can still edit (mirrors InnovationsService.update in the API). */
const OWNER_EDITABLE = ['DRAFT', 'REJECTED'];
const ADMIN_ROLES: string[] = [Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN];

export const isPlatformAdmin = (roles: readonly string[] | undefined) => Boolean(roles?.some((r) => ADMIN_ROLES.includes(r)));

/**
 * Whether the generic innovation edit form (and attachment / team management) is available.
 * - Challenge submissions: never — their answers are a fixed snapshot of the challenge's own form.
 * - DRAFT / REJECTED: yes (owner, or anyone the API already lets through).
 * - Any other status (under review, published …): Platform / System admins only (2026-11-17).
 */
export function canEditInnovation(
  innovation: { reviewStatus: string; submissionChannel?: string | null },
  roles: readonly string[] | undefined,
): boolean {
  if (innovation.submissionChannel === 'CHALLENGE') return false;
  return OWNER_EDITABLE.includes(innovation.reviewStatus) || isPlatformAdmin(roles);
}

/** Submitting for review only makes sense before the pipeline has started (or after a rejection). */
export const canSubmitForReview = (innovation: { reviewStatus: string; submissionChannel?: string | null }) =>
  innovation.submissionChannel !== 'CHALLENGE' && OWNER_EDITABLE.includes(innovation.reviewStatus);
