'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { InnovationCardDto } from './use-content';

export interface SearchParams {
  q?: string;
  categoryId?: string;
  developmentStage?: string;
  innovationType?: string;
  organizationType?: string;
  regionId?: string;
  sort?: 'newest' | 'popular' | 'az';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: InnovationCardDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useRepositorySearch(params: SearchParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });

  return useQuery({
    queryKey: ['repository-search', query.toString()],
    queryFn: () => api.get<SearchResult>(`/repository/search?${query.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useInnovation(idOrSlug: string) {
  return useQuery({
    queryKey: ['innovation', idOrSlug],
    queryFn: () => api.get(`/innovations/${idOrSlug}`),
    enabled: Boolean(idOrSlug),
  });
}

export function useRelatedInnovations(innovationId: string) {
  return useQuery({
    queryKey: ['related-innovations', innovationId],
    queryFn: () => api.get<InnovationCardDto[]>(`/repository/related/${innovationId}`),
    enabled: Boolean(innovationId),
  });
}
