'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface SubmissionSettings {
  generalSubmissionEnabled: boolean;
}

/** Admin-controlled switches read from the backend (GET /settings/submission, public). */
export function useSubmissionSettings() {
  return useQuery({
    queryKey: ['submission-settings'],
    queryFn: () => api.get<SubmissionSettings>('/settings/submission', { skipAuth: true }),
    staleTime: 60_000,
  });
}

/**
 * True only once the backend has confirmed general submission is open — so a disabled switch
 * never flashes a "Submit an Innovation" button while the setting is loading.
 */
export function useGeneralSubmissionOpen() {
  const { data } = useSubmissionSettings();
  return data?.generalSubmissionEnabled === true;
}

export function useUpdateSubmissionSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SubmissionSettings>) => api.patch<SubmissionSettings>('/settings/submission', input),
    onSuccess: (data) => queryClient.setQueryData(['submission-settings'], data),
  });
}
