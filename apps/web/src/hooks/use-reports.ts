'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useKpis() {
  return useQuery({ queryKey: ['kpis'], queryFn: () => api.get('/reporting/kpis') });
}

export function useFundUtilization() {
  return useQuery({ queryKey: ['fund-utilization'], queryFn: () => api.get('/reporting/fund-utilization') });
}

export function useServiceAnalytics() {
  return useQuery({ queryKey: ['service-analytics'], queryFn: () => api.get('/reporting/service-analytics') });
}
