'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useMyInnovations() {
  return useQuery({ queryKey: ['my-innovations'], queryFn: () => api.get('/innovations/mine') });
}

export function useCreateInnovation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.post('/innovations', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-innovations'] }),
  });
}

export function useUpdateInnovation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.patch(`/innovations/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-innovations'] });
      queryClient.invalidateQueries({ queryKey: ['innovation', id] });
    },
  });
}

export function useSubmitInnovation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/innovations/${id}/submit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-innovations'] }),
  });
}

export function useAddAttachment(innovationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: string; url: string; caption?: string; mimeType?: string; sizeBytes?: number }) =>
      api.post(`/innovations/${innovationId}/attachments`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['innovation', innovationId] }),
  });
}

export function useAddTeamMember(innovationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { displayName: string; roleInTeam?: string }) =>
      api.post(`/innovations/${innovationId}/team`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['innovation', innovationId] }),
  });
}

export function useUpdateInnovationStatus(innovationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reviewStatus: string; note?: string }) => api.patch(`/innovations/${innovationId}/status`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['innovation', innovationId] });
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['preliminary-review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['authenticity-review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['review-comments', innovationId] });
    },
  });
}

export function useUpdateInnovationApproval(innovationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      recognitionApproved?: boolean;
      recognitionApprovalComment?: string;
      mentorApproved?: boolean;
      mentorApprovalComment?: string;
      fundApproved?: boolean;
      fundApprovalComment?: string;
      approvalLetterUrl?: string;
      // Set only by the deliberate "Save approval decisions" click — see InnovationsService.updateApproval.
      finalize?: boolean;
    }) => api.patch(`/innovations/${innovationId}/approval`, input),
    // `finalize: true` can also move reviewStatus SELECTED -> PUBLISHED server-side, which is what
    // moves the innovation from the Admin Evaluations "Pending" tab to "Reviewed" — invalidate
    // everything that could be showing that status, not just this one innovation.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['innovation', innovationId] });
      queryClient.invalidateQueries({ queryKey: ['shortlisted-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
    },
  });
}

export function useReviewComments(innovationId: string) {
  return useQuery({
    queryKey: ['review-comments', innovationId],
    queryFn: () => api.get(`/innovations/${innovationId}/review-comments`),
    enabled: Boolean(innovationId),
  });
}
