'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function usePreliminaryReviewQueue(reviewStatus?: string) {
  return useQuery({
    queryKey: ['preliminary-review-queue', reviewStatus],
    queryFn: () => api.get(`/innovations/preliminary-review-queue${reviewStatus ? `?reviewStatus=${reviewStatus}` : ''}`),
  });
}
