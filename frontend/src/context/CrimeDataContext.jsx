import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getCrimeStats, getCrimeTrends } from '../services/crimeService';

// Create context
export const CrimeDataContext = createContext();

export const CrimeDataProvider = ({ children }) => {
  const [crimeStats, setCrimeStats] = useState(null);
  const [crimeTrends, setCrimeTrends] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filters, setFilters] = useState({
    timeFrame: 'last30Days',  // 'last24Hours', 'last7Days', 'last30Days', 'lastYear', 'custom'
    crimeTypes: [],
    startDate: null,
    endDate: null,
    location: null,
    radius: 5,
  });
  
  // Fetch crime statistics based on current filters
  const fetchCrimeStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const stats = await getCrimeStats(filters);
      setCrimeStats(stats);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching crime statistics:', err);
      setError('Failed to load crime statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  // Fetch crime trends based on current filters
  const fetchCrimeTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const trends = await getCrimeTrends(filters);
      setCrimeTrends(trends);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching crime trends:', err);
      setError('Failed to load crime trends. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  // Fetch both stats and trends
  const fetchCrimeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [stats, trends] = await Promise.all([
        getCrimeStats(filters),
        getCrimeTrends(filters)
      ]);
      
      setCrimeStats(stats);
      setCrimeTrends(trends);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching crime data:', err);
      setError('Failed to load crime data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  // Update filters
  const updateFilters = (newFilters) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
  };
  
  // Reset filters to default
  const resetFilters = () => {
    setFilters({
      timeFrame: 'last30Days',
      crimeTypes: [],
      startDate: null,
      endDate: null,
      location: null,
      radius: 5,
    });
  };
  
  // Context value
  const contextValue = {
    crimeStats,
    crimeTrends,
    loading,
    error,
    lastUpdated,
    filters,
    updateFilters,
    resetFilters,
    fetchCrimeStats,
    fetchCrimeTrends,
    fetchCrimeData,
  };
  
  return (
    <CrimeDataContext.Provider value={contextValue}>
      {children}
    </CrimeDataContext.Provider>
  );
};
