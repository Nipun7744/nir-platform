'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useModerationQueue(reviewStatus?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['moderation-queue', reviewStatus],
    queryFn: () => api.get(`/innovations/moderation-queue${reviewStatus ? `?reviewStatus=${reviewStatus}` : ''}`),
    enabled: options?.enabled ?? true,
  });
}

export function useEvaluators() {
  return useQuery({ queryKey: ['evaluators'], queryFn: () => api.get('/users/evaluators') });
}

export function useAssignPanel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { innovationId: string; evaluatorId: string }) => api.post('/evaluations/panel-assignments', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation-queue'] }),
  });
}
