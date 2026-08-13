'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useMinistryCycles() {
  return useQuery({ queryKey: ['ministry-cycles'], queryFn: () => api.get('/ministries/cycles') });
}

export function useMySubmissions() {
  return useQuery({ queryKey: ['ministry-submissions-mine'], queryFn: () => api.get('/ministries/submissions/mine') });
}

export function useCreateMinistrySubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { cycleId: string }) => api.post('/ministries/submissions', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ministry-submissions-mine'] }),
  });
}

export function useSubmitMinistrySubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/ministries/submissions/${id}/submit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ministry-submissions-mine'] }),
  });
}
