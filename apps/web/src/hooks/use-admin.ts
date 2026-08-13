'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiFetch } from '@/lib/api-client';

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFetch<{ url: string }>('/uploads', { method: 'POST', body: formData, isForm: true });
    },
  });
}

export function useAdminUsers(search?: string) {
  return useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => api.get(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });
}

export function usePendingUsers(enabled = true) {
  return useQuery({
    queryKey: ['admin-users', 'pending'],
    queryFn: () => api.get('/users?status=pending&pageSize=100'),
    refetchInterval: 30_000,
    enabled,
  });
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) => api.patch(`/users/${id}/roles`, { roles }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useUpdateEvaluatorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; designation?: string; institution?: string; categoryIds?: string[] }) =>
      api.patch(`/users/${id}/evaluator-profile`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useUpdatePreliminaryReviewerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; categoryIds?: string[] }) =>
      api.patch(`/users/${id}/preliminary-reviewer-profile`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useUpdateAuthenticityReviewerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; categoryIds?: string[] }) =>
      api.patch(`/users/${id}/authenticity-reviewer-profile`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/users/${id}/status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useRejectUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.post('/categories', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useToggleCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/categories/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

// -- Public portal content management (News, Challenges, Resources, Partners, FAQ) --

function useAdminList<T = any>(key: string, path: string) {
  return useQuery({
    queryKey: [key],
    queryFn: () => api.get<T[]>(path),
  });
}

function useAdminCreate(key: string, path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.post(path, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
  });
}

function useAdminUpdate(key: string, path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) => api.patch(`${path}/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
  });
}

function useAdminDelete(key: string, path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${path}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
  });
}

// News & Events
export const useAdminNews = () => useAdminList('admin-news', '/news/admin');
export const useCreateNews = () => useAdminCreate('admin-news', '/news');
export const useUpdateNews = () => useAdminUpdate('admin-news', '/news');
export const useDeleteNews = () => useAdminDelete('admin-news', '/news');

// Innovation Challenges
export const useAdminChallenges = () => useAdminList('admin-challenges', '/challenges');
export const useCreateChallenge = () => useAdminCreate('admin-challenges', '/challenges');
export const useUpdateChallenge = () => useAdminUpdate('admin-challenges', '/challenges');
export const useDeleteChallenge = () => useAdminDelete('admin-challenges', '/challenges');

// Resources
export const useAdminResources = () => useAdminList('admin-resources', '/resources');
export const useCreateResource = () => useAdminCreate('admin-resources', '/resources');
export const useUpdateResource = () => useAdminUpdate('admin-resources', '/resources');
export const useDeleteResource = () => useAdminDelete('admin-resources', '/resources');

// Partners
export const useAdminPartners = () => useAdminList('admin-partners', '/partners/admin');
export const useCreatePartner = () => useAdminCreate('admin-partners', '/partners');
export const useUpdatePartner = () => useAdminUpdate('admin-partners', '/partners');
export const useDeletePartner = () => useAdminDelete('admin-partners', '/partners');

// FAQ
export const useAdminFaqs = () => useAdminList('admin-faqs', '/faqs/admin');
export const useCreateFaq = () => useAdminCreate('admin-faqs', '/faqs');
export const useUpdateFaq = () => useAdminUpdate('admin-faqs', '/faqs');
export const useDeleteFaq = () => useAdminDelete('admin-faqs', '/faqs');
