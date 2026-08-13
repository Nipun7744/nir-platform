'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth-store';
import type { Role } from '@nir/shared';

export function useRequireAuth() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !accessToken) router.replace('/sign-in');
  }, [hasHydrated, accessToken, router]);

  return hasHydrated ? user : undefined;
}

export function useHasRole(...roles: Role[]) {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  return roles.some((r) => user.roles.includes(r));
}
