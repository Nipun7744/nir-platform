'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useAuthenticityReviewQueue(reviewStatus?: string) {
  return useQuery({
    queryKey: ['authenticity-review-queue', reviewStatus],
    queryFn: () => api.get(`/innovations/authenticity-review-queue${reviewStatus ? `?reviewStatus=${reviewStatus}` : ''}`),
  });
}
