'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useRegisterInvestor() {
  return useMutation({
    mutationFn: (input: { organizationName: string; binNumber?: string }) => api.post('/investors/register', input),
  });
}

export function useMyEois() {
  return useQuery({ queryKey: ['my-eois'], queryFn: () => api.get('/eoi/mine') });
}

export function useInvestorDirectory(categoryId?: string) {
  return useQuery({
    queryKey: ['investor-directory', categoryId],
    queryFn: () => api.get(`/investors${categoryId ? `?categoryId=${categoryId}` : ''}`),
  });
}

export function useMyReferrals() {
  return useQuery({ queryKey: ['my-referrals'], queryFn: () => api.get('/investors/referrals/mine') });
}

export function useCreateReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { innovationId: string; investorId: string; message?: string }) =>
      api.post('/investors/referrals', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-referrals'] }),
  });
}

export function useCreateEoi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { innovationId: string; message?: string }) => api.post('/eoi', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-eois'] }),
  });
}
