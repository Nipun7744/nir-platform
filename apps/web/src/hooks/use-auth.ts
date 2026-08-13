'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface AuthResponse {
  user: { id: string; email: string; fullName: string; roles: string[]; locale: string };
  accessToken: string;
  refreshToken: string;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; password: string }) => api.post<AuthResponse>('/auth/login', input),
    onSuccess: (data) => {
      setSession(data as any);
      queryClient.invalidateQueries();
    },
  });
}

interface RegisterResponse {
  pending: true;
  message: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      role?: 'INVESTOR' | 'MENTOR' | 'MINISTRY_FOCAL_POINT';
      organizationName?: string;
      binNumber?: string;
      sectorInterestIds?: string[];
      bio?: string;
      availability?: string;
      expertiseTagIds?: string[];
      ministryId?: string;
      title?: string;
    }) => api.post<RegisterResponse>('/auth/register', input),
  });
}

export function useLogout() {
  const { refreshToken, clear } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (refreshToken ? api.post('/auth/logout', { refreshToken }) : Promise.resolve()),
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me'),
    enabled: Boolean(accessToken),
    retry: false,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation({
    mutationFn: (input: {
      fullName?: string;
      phone?: string;
      designation?: string;
      institution?: string;
      avatarUrl?: string;
      categoryIds?: string[];
    }) => api.patch('/users/me', input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      if (variables.fullName && user && accessToken && refreshToken) {
        setSession({ accessToken, refreshToken, user: { ...user, fullName: variables.fullName } });
      }
    },
  });
}
