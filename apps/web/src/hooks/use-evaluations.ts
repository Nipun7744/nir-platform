'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useAssignedEvaluations() {
  return useQuery({ queryKey: ['assigned-evaluations'], queryFn: () => api.get('/evaluations/assigned-to-me') });
}

export function useEvaluationsForInnovation(innovationId: string) {
  return useQuery({
    queryKey: ['evaluations-for-innovation', innovationId],
    queryFn: () => api.get(`/evaluations/by-innovation/${innovationId}`),
    enabled: Boolean(innovationId),
  });
}

export function useSubmitEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      innovationId: string;
      scores: Record<string, number>;
      comments?: string;
      recommendation: 'SHORTLIST' | 'REJECT';
    }) => api.post('/evaluations', input),
    // A SHORTLIST/REJECT decision here also changes the innovation's reviewStatus server-side
    // (see EvaluationsService.submitEvaluation) — invalidate everything that could be showing
    // that status, not just the evaluator's own assignment list.
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assigned-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['innovation', variables.innovationId] });
      queryClient.invalidateQueries({ queryKey: ['shortlisted-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
    },
  });
}

export function useFlagIp() {
  return useMutation({
    mutationFn: (input: { innovationId: string; note?: string }) => api.post('/evaluations/ip-flags', input),
  });
}

export function useShortlistedEvaluations() {
  return useQuery({ queryKey: ['shortlisted-evaluations'], queryFn: () => api.get('/evaluations/shortlisted') });
}

export function useIpFlags() {
  return useQuery({ queryKey: ['ip-flags'], queryFn: () => api.get('/evaluations/ip-flags') });
}
