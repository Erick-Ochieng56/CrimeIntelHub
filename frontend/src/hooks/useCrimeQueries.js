import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCrimes,
  getCrimeSummaries,
  getExportedCrimeSummary,
  getCurrentHotspots,
  getCrimeTrends,
  getCrimeHeatmap,
  getMapViewport,
} from '../services/crimeService';
import { neighborTileParams, viewportTileKey } from '../utils/mapTiles';

export const crimeQueryKeys = {
  crimes: (params) => ['crimes', params],
  viewport: (params) => ['map-viewport', viewportTileKey(params), params],
  summaries: (params) => ['crime-summaries', params],
  exported: (params) => ['exported-summary', params],
  hotspots: ['hotspots'],
  trends: (params) => ['crime-trends', params],
  heatmap: (params) => ['crime-heatmap', params],
};

export const useCrimes = (params, options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.crimes(params),
    queryFn: () => getCrimes(params),
    enabled: !!params,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/** Zoom-tiered viewport data (districts / clusters / points). */
export const useMapViewport = (params, options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.viewport(params),
    queryFn: () => getMapViewport(params),
    enabled: !!params?.northEastLat && !!params?.southWestLat,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    retry: (failureCount, error) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 1;
    },
    ...options,
  });
};

export const useCrimeSummaries = (params = {}, options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.summaries(params),
    queryFn: () => getCrimeSummaries({ ...params, hierarchical: true }),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    enabled: false,
    ...options,
  });
};

export const useExportedCrimeSummary = (params = {}, options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.exported(params),
    queryFn: () => getExportedCrimeSummary(params),
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    enabled: false,
    ...options,
  });
};

export const useHotspots = (options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.hotspots,
    queryFn: getCurrentHotspots,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useCrimeTrends = (params, options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.trends(params),
    queryFn: () => getCrimeTrends(params),
    enabled: !!params,
    staleTime: 1000 * 60 * 10,
    ...options,
  });
};

export const useCrimeHeatmap = (params, options = {}) => {
  return useQuery({
    queryKey: crimeQueryKeys.heatmap(params),
    queryFn: () => getCrimeHeatmap(params),
    enabled: !!params,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

export const usePrefetchCrimes = () => {
  const queryClient = useQueryClient();

  const prefetchCrimes = (params) => {
    queryClient.prefetchQuery({
      queryKey: crimeQueryKeys.crimes(params),
      queryFn: () => getCrimes(params),
      staleTime: 1000 * 60 * 2,
    });
  };

  const prefetchViewportNeighbors = (tileParams, extras = {}) => {
    if (!tileParams) return;
    neighborTileParams(tileParams).forEach((neighbor) => {
      const params = { ...neighbor, ...extras };
      queryClient.prefetchQuery({
        queryKey: crimeQueryKeys.viewport(params),
        queryFn: () => getMapViewport(params),
        staleTime: 1000 * 60 * 5,
      });
    });
  };

  return { prefetchCrimes, prefetchViewportNeighbors };
};
