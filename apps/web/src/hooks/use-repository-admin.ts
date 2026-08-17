'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface RepositoryFilters {
  status?: 'APPROVED' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
  categoryId?: string;
  q?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  [key: string]: unknown;
}

function toQueryString(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useRepositoryInnovations(filters: RepositoryFilters) {
  return useQuery({
    queryKey: ['repository-admin', filters],
    queryFn: () => api.get(`/innovations/admin/repository${toQueryString(filters)}`),
  });
}

export function useRemoveAttachment(innovationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => api.delete(`/innovations/${innovationId}/attachments/${attachmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['innovation', innovationId] });
      queryClient.invalidateQueries({ queryKey: ['repository-admin'] });
      queryClient.invalidateQueries({ queryKey: ['activity-log', innovationId] });
      queryClient.invalidateQueries({ queryKey: ['activity-log', undefined] });
    },
  });
}

export function useReplaceAttachment(innovationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      attachmentId,
      ...input
    }: { attachmentId: string; url: string; caption?: string; mimeType?: string; sizeBytes?: number }) =>
      api.patch(`/innovations/${innovationId}/attachments/${attachmentId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['innovation', innovationId] });
      queryClient.invalidateQueries({ queryKey: ['repository-admin'] });
      queryClient.invalidateQueries({ queryKey: ['activity-log', innovationId] });
      queryClient.invalidateQueries({ queryKey: ['activity-log', undefined] });
    },
  });
}

export function useUpdateFeatured(innovationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featured: boolean) => api.patch(`/innovations/${innovationId}/featured`, { featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['innovation', innovationId] });
      queryClient.invalidateQueries({ queryKey: ['repository-admin'] });
      queryClient.invalidateQueries({ queryKey: ['featured-innovations'] });
      queryClient.invalidateQueries({ queryKey: ['activity-log', innovationId] });
      queryClient.invalidateQueries({ queryKey: ['activity-log', undefined] });
    },
  });
}

export function useInnovationActivityLog(innovationId: string, enabled = true) {
  return useQuery({
    queryKey: ['activity-log', innovationId],
    queryFn: () => api.get(`/innovations/${innovationId}/activity-log`),
    enabled: enabled && Boolean(innovationId),
  });
}

export function useRepositoryActivityLog() {
  return useQuery({
    queryKey: ['activity-log', undefined],
    queryFn: () => api.get('/innovations/admin/activity-log'),
  });
}
