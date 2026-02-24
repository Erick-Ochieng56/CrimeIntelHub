import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCrimes,
  getCrimeSummaries,
  getExportedCrimeSummary,
  getCurrentHotspots,
  getCrimeTrends,
  getCrimeHeatmap
} from '../services/crimeService';

// Query keys
export const crimeQueryKeys = {
  crimes: (params) => ['crimes', params],
  summaries: ['crime-summaries'],
  exported: ['exported-summary'],
  hotspots: ['hotspots'],
  trends: (params) => ['crime-trends', params],
  heatmap: (params) => ['crime-heatmap', params],
};

// Crimes query hook
export const useCrimes = (params, options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.crimes(params),
    queryFn: () => getCrimes(params),
    enabled: !!params, // Only run if params exist
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
};

// Crime summaries query hook
export const useCrimeSummaries = (options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.summaries,
    queryFn: getCrimeSummaries,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

// Exported crime summary query hook
export const useExportedCrimeSummary = (options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.exported,
    queryFn: getExportedCrimeSummary,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

// Hotspots query hook
export const useHotspots = (options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.hotspots,
    queryFn: getCurrentHotspots,
    staleTime: 1000 * 60 * 15, // 15 minutes - hotspots don't change often
    ...options,
  });
};

// Crime trends query hook
export const useCrimeTrends = (params, options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.trends(params),
    queryFn: () => getCrimeTrends(params),
    enabled: !!params,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};


// Crime heatmap query hook
export const useCrimeHeatmap = (params, options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.heatmap(params),
    queryFn: () => getCrimeHeatmap(params),
    enabled: !!params,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

// Hook to prefetch crimes for a given bounds
export const usePrefetchCrimes = () => {
  const queryClient = useQueryClient();

  const prefetchCrimes = (params) => {
    queryClient.prefetchQuery({
      queryKey: crimeQueryKeys.crimes(params),
      queryFn: () => getCrimes(params),
      staleTime: 1000 * 60 * 2,
    });
  };

  return { prefetchCrimes };
};
