'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function usePipelineBoard() {
  return useQuery({ queryKey: ['pipeline-board'], queryFn: () => api.get('/pipeline/board') });
}

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ innovationId, pipelineStage }: { innovationId: string; pipelineStage: string }) =>
      api.patch(`/pipeline/innovations/${innovationId}/stage`, { pipelineStage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-board'] }),
  });
}

export function useAddPipelineNote() {
  return useMutation({
    mutationFn: (input: { innovationId: string; note: string }) => api.post('/pipeline/notes', input),
  });
}

export function useCreateDisbursement() {
  return useMutation({
    mutationFn: (input: { innovationId: string; amount: number; source: string; disbursedAt: string; note?: string }) =>
      api.post('/fund-disbursements', input),
  });
}
