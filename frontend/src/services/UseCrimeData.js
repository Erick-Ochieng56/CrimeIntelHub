import { useState, useCallback } from 'react';
import * as crimeService from '../services/crimeService';

const useCrimeData = () => {
  const [crimeData, setCrimeData] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCrimeData = useCallback(async (timeFrame = 'lastMonth', lat = -4.0435, lng = 39.6682, radius = 5) => {
    setLoading(true);
    setError(null);
    try {
      // Map timeFrame to backend-compatible values
      const timeFrameMap = {
        last24Hours: 'last24Hours',
        lastWeek: 'last7Days',
        lastMonth: 'last30Days',
        lastYear: 'thisYear',
        allTime: 'allTime',
      };
      const backendTimeFrame = timeFrameMap[timeFrame] || 'last30Days';

      // Fetch recent crimes
      const crimes = await crimeService.getCrimes({
        lat,
        lng,
        radius,
        date_from: getDateFromTimeFrame(timeFrame),
        page_size: 5, // For recent crimes table
      });
      setCrimeData(crimes.results);

      // Fetch stats
      const stats = await crimeService.getCrimeStats({
        time_frame: backendTimeFrame,
        lat,
        lng,
        radius,
      });
      setStatsData(stats);

      // Fetch trends (mocked or custom endpoint)
      const trends = await crimeService.getCrimeTrends({
        time_frame: backendTimeFrame,
        lat,
        lng,
        radius,
      });
      setTrendsData(trends);
    } catch (err) {
      setError('Failed to fetch crime data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback((timeFrame, lat, lng, radius) => {
    fetchCrimeData(timeFrame, lat, lng, radius);
  }, [fetchCrimeData]);

  const exportData = useCallback(async (timeFrame, lat, lng, radius) => {
    try {
      const crimes = await crimeService.getCrimes({
        lat,
        lng,
        radius,
        date_from: getDateFromTimeFrame(timeFrame),
        page_size: 1000, // Larger for export
      });
      const csvContent = convertToCSV(crimes.results);
      downloadCSV(csvContent, `crime_data_${timeFrame}.csv`);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  return { crimeData, statsData, trendsData, loading, error, fetchCrimeData, refreshData, exportData };
};

const getDateFromTimeFrame = (timeFrame) => {
  const now = new Date();
  switch (timeFrame) {
    case 'last24Hours':
      return new Date(now.setHours(now.getHours() - 24)).toISOString().split('T')[0];
    case 'lastWeek':
      return new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
    case 'lastMonth':
      return new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
    case 'lastYear':
      return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
    case 'allTime':
      return '2017-01-01'; // Based on data range
    default:
      return new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
  }
};

const convertToCSV = (data) => {
  const headers = ['Date', 'Type', 'Location', 'Status'];
  const rows = data.map(crime => [
    new Date(crime.date).toLocaleString(),
    crime.type,
    crime.block_address || `${crime.latitude}, ${crime.longitude}`,
    crime.status,
  ]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

const downloadCSV = (content, fileName) => {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export default useCrimeData;