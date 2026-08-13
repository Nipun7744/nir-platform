'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useMyMentorMatches() {
  return useQuery({ queryKey: ['mentor-matches'], queryFn: () => api.get('/mentors/matches/mine') });
}

export function useMentorDirectory(tagIds?: string[]) {
  const query = tagIds?.length ? `?tagIds=${tagIds.join(',')}` : '';
  return useQuery({ queryKey: ['mentor-directory', tagIds], queryFn: () => api.get(`/mentors${query}`) });
}

export function useCreateMentorMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { mentorId: string; innovationId: string }) => api.post('/mentors/matches', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentor-matches'] }),
  });
}

export function useMyMentorSessions() {
  return useQuery({ queryKey: ['mentor-sessions'], queryFn: () => api.get('/mentors/sessions/mine') });
}

export function useProposeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { mentorId: string; innovatorUserId: string; innovationId?: string; scheduledAt: string; mode?: string }) =>
      api.post('/mentors/sessions', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentor-sessions'] }),
  });
}

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/mentors/sessions/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentor-sessions'] }),
  });
}

export function useLogMentorActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { hours: number; description?: string }) => api.post('/mentors/activity-logs', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentor-activity-logs'] }),
  });
}

export function useMyMentorActivityLogs() {
  return useQuery({ queryKey: ['mentor-activity-logs'], queryFn: () => api.get('/mentors/activity-logs/mine') });
}
