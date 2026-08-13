'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface PublicStats {
  totalInnovations: number;
  totalInnovators: number;
  totalOrganizations: number;
  totalCategories: number;
  openChallenges: number;
  ideasFunded: number;
}

export interface CategoryDto {
  id: string;
  slug: string;
  icon: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  examplesEn?: string;
}

export interface InnovationCardDto {
  id: string;
  innovationCode: string;
  slug: string;
  titleEn: string;
  titleBn?: string;
  summaryEn: string;
  developmentStage: string;
  innovationType: string;
  viewCount: number;
  publishedAt: string;
  category: { id: string; slug: string; nameEn: string; nameBn: string; icon: string };
  region?: { nameEn: string; nameBn: string } | null;
  organization?: { name: string; type: string; logoUrl?: string } | null;
  attachments?: { url: string; kind: string }[];
}

export interface ChallengeDto {
  id: string;
  slug: string;
  titleEn: string;
  organizingAgency: string;
  descriptionEn: string;
  status: string;
  isFeatured?: boolean;
  startDate?: string;
  deadline?: string;
  bannerImageUrl?: string;
  prizeInfoEn?: string;
  applyUrl?: string;
}

export interface NewsPostDto {
  id: string;
  slug: string;
  titleEn: string;
  titleBn?: string;
  bodyEn: string;
  bodyBn?: string;
  coverImageUrl?: string;
  eventDate?: string;
  publishedAt?: string;
  category: string;
}

export interface PartnerDto {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
}

export function usePublicStats() {
  return useQuery({ queryKey: ['public-stats'], queryFn: () => api.get<PublicStats>('/reporting/public-stats') });
}

export interface PublicBreakdown {
  byCategory: { categoryId: string; nameEn: string; nameBn: string; count: number }[];
  byStage: { stage: string; count: number }[];
  byRegion: { regionId: string; nameEn: string; nameBn: string; count: number }[];
}

export function usePublicBreakdown() {
  return useQuery({
    queryKey: ['public-breakdown'],
    queryFn: () => api.get<PublicBreakdown>('/reporting/public-breakdown'),
  });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.get<CategoryDto[]>('/categories') });
}

export function useFeaturedInnovations(limit = 3) {
  return useQuery({
    queryKey: ['featured-innovations', limit],
    queryFn: () => api.get<InnovationCardDto[]>(`/repository/featured?limit=${limit}`),
  });
}

export function useChallenges() {
  return useQuery({ queryKey: ['challenges'], queryFn: () => api.get<ChallengeDto[]>('/challenges') });
}

export function useChallenge(slug: string) {
  return useQuery({ queryKey: ['challenge', slug], queryFn: () => api.get<ChallengeDto>(`/challenges/${slug}`) });
}

export function useNews(page = 1, pageSize = 9) {
  return useQuery({
    queryKey: ['news', page, pageSize],
    queryFn: () =>
      api.get<{ items: NewsPostDto[]; total: number; totalPages: number }>(
        `/news?page=${page}&pageSize=${pageSize}`,
      ),
  });
}

export function useNewsPost(slug: string) {
  return useQuery({ queryKey: ['news-post', slug], queryFn: () => api.get<NewsPostDto>(`/news/${slug}`) });
}

export function usePartners() {
  return useQuery({ queryKey: ['partners'], queryFn: () => api.get<PartnerDto[]>('/partners') });
}

export function useResources(type?: string) {
  return useQuery({
    queryKey: ['resources', type],
    queryFn: () => api.get(`/resources${type ? `?type=${type}` : ''}`),
  });
}

export interface FaqDto {
  id: string;
  categoryLabel: string;
  questionEn: string;
  questionBn?: string;
  answerEn: string;
  answerBn?: string;
  sortOrder: number;
}

export function useFaqs() {
  return useQuery({ queryKey: ['faqs'], queryFn: () => api.get<FaqDto[]>('/faqs') });
}

export interface RegionDto {
  id: string;
  type: string;
  nameEn: string;
  nameBn: string;
}

export function useRegions() {
  return useQuery({ queryKey: ['regions'], queryFn: () => api.get<RegionDto[]>('/regions') });
}

export interface MinistryDto {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
}

export function useMinistries() {
  return useQuery({ queryKey: ['ministries'], queryFn: () => api.get<MinistryDto[]>('/ministries') });
}

export interface TagDto {
  id: string;
  type: 'THEMATIC' | 'TECHNOLOGY';
  nameEn: string;
  nameBn: string;
}

export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: () => api.get<TagDto[]>('/tags') });
}
