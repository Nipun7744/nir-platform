'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useSubmitterProfile(userId?: string) {
  return useQuery({
    queryKey: ['submitter-profile', userId],
    queryFn: () => api.get(`/users/${userId}/submitter-profile`),
    enabled: Boolean(userId),
    retry: false,
  });
}
