import { Role } from '@prisma/client';

/** Platform-wide administrators: they bypass category routing, submission switches and previews. */
export const ADMIN_ROLES: readonly Role[] = [Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN];

/**
 * Roles that work the review pipeline. They see unpublished submissions in full
 * (see InnovationsService.findOneForViewer).
 */
export const REVIEW_PIPELINE_ROLES: readonly Role[] = [
  ...ADMIN_ROLES,
  Role.INSTITUTIONAL_COORDINATOR,
  Role.INNOVATION_MANAGER,
  Role.PRELIMINARY_REVIEWER,
  Role.AUTHENTICITY_REVIEWER,
];

export const isAdmin = (roles?: readonly Role[]) => Boolean(roles?.some((r) => ADMIN_ROLES.includes(r)));

export const hasAnyRole = (roles: readonly Role[] | undefined, allowed: readonly Role[]) =>
  Boolean(roles?.some((r) => allowed.includes(r)));
