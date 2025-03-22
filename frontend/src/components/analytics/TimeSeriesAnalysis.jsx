import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import Card from '../common/Card';
import Loader from '../common/Loader';
import { getTimeSeriesData } from '../../services/crimeService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const TimeSeriesAnalysis = () => {
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [aggregationPeriod, setAggregationPeriod] = useState('monthly');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    endDate: new Date(),
  });
  const [selectedCrimeTypes, setSelectedCrimeTypes] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  
  const crimeTypes = [
    { value: 'THEFT', label: 'Theft' },
    { value: 'ASSAULT', label: 'Assault' },
    { value: 'BURGLARY', label: 'Burglary' },
    { value: 'ROBBERY', label: 'Robbery' },
    { value: 'VANDALISM', label: 'Vandalism' },
    { value: 'DRUG', label: 'Drug Offenses' },
    { value: 'FRAUD', label: 'Fraud' },
    { value: 'OTHER', label: 'Other' },
  ];
  
  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'downtown', label: 'Downtown' },
    { value: 'north', label: 'North Area' },
    { value: 'south', label: 'South Area' },
    { value: 'east', label: 'East Area' },
    { value: 'west', label: 'West Area' },
  ];
  
  const aggregationOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ];
  
  // Create chart with time series data
  useEffect(() => {
    if (!timeSeriesData || !chartRef.current) return;
    
    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    // Prepare data for the chart
    const datasets = Object.entries(timeSeriesData.series).map(([crimeType, data], index) => {
      const colorMap = {
        THEFT: 'rgba(239, 68, 68, 0.7)', // red
        ASSAULT: 'rgba(221, 107, 32, 0.7)', // orange
        BURGLARY: 'rgba(202, 138, 4, 0.7)', // yellow
        ROBBERY: 'rgba(112, 26, 117, 0.7)', // purple
        VANDALISM: 'rgba(37, 99, 235, 0.7)', // blue
        DRUG: 'rgba(34, 197, 94, 0.7)', // green
        FRAUD: 'rgba(107, 70, 193, 0.7)', // indigo
        OTHER: 'rgba(156, 163, 175, 0.7)', // gray
      };
      
      return {
        label: crimeType,
        data: data,
        borderColor: colorMap[crimeType] || `hsl(${index * 30}, 70%, 50%)`,
        backgroundColor: colorMap[crimeType]?.replace('0.7', '0.2') || `hsla(${index * 30}, 70%, 50%, 0.2)`,
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        pointRadius: data.length < 20 ? 3 : 0,
        pointHoverRadius: 5,
      };
    });
    
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeSeriesData.labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 10,
            cornerRadius: 4,
            callbacks: {
              title: function(context) {
                const label = context[0].label;
                // Format date based on aggregation period
                return label;
              },
            }
          },
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: getTimeUnit(),
              displayFormats: {
                day: 'MMM d, yyyy',
                week: 'MMM d, yyyy',
                month: 'MMM yyyy',
                quarter: 'QQQ yyyy',
                year: 'yyyy',
              },
            },
            grid: {
              display: false,
            },
            title: {
              display: true,
              text: 'Time Period',
              font: {
                size: 14,
                weight: 'bold',
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            title: {
              display: true,
              text: 'Number of Incidents',
              font: {
                size: 14,
                weight: 'bold',
              },
            },
            ticks: {
              precision: 0,
            },
          },
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
      },
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [timeSeriesData]);
  
  // Helper function to get appropriate time unit for chart
  const getTimeUnit = () => {
    switch (aggregationPeriod) {
      case 'daily':
        return 'day';
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
      case 'quarterly':
        return 'quarter';
      case 'yearly':
        return 'year';
      default:
        return 'month';
    }
  };
  
  const handleCrimeTypeToggle = (type) => {
    if (selectedCrimeTypes.includes(type)) {
      setSelectedCrimeTypes(selectedCrimeTypes.filter(t => t !== type));
    } else {
      setSelectedCrimeTypes([...selectedCrimeTypes, type]);
    }
  };
  
  // Fetch time series data
  const fetchTimeSeriesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0],
        aggregation: aggregationPeriod,
      };
      
      if (selectedCrimeTypes.length > 0) {
        params.crimeTypes = selectedCrimeTypes.join(',');
      }
      
      if (selectedLocation !== 'all') {
        params.location = selectedLocation;
      }
      
      const data = await getTimeSeriesData(params);
      setTimeSeriesData(data);
    } catch (err) {
      console.error('Error fetching time series data:', err);
      setError('Failed to load time series data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTimeSeriesData();
  }, []);
  
  const handleApplyFilters = () => {
    fetchTimeSeriesData();
  };
  
  // Calculate percentage change from first to last period
  const calculateTrend = (series) => {
    if (!series || series.length < 2) return { value: 0, increasing: false };
    
    const first = series[0];
    const last = series[series.length - 1];
    
    if (first === 0) return { value: last > 0 ? 100 : 0, increasing: last > 0 };
    
    const percentChange = ((last - first) / first) * 100;
    return {
      value: Math.abs(percentChange.toFixed(1)),
      increasing: percentChange > 0
    };
  };
  
  // Calculate total incidents
  const calculateTotal = (series) => {
    if (!series) return 0;
    return series.reduce((sum, val) => sum + val, 0);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Time Series Crime Analysis</h2>
          <p className="text-gray-600 mb-6">
            Analyze crime trends over time to identify patterns, seasonal fluctuations, and long-term changes.
            This visualization helps in understanding how crime rates change temporally.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
              <div className="flex space-x-2">
                <DatePicker
                  selected={dateRange.startDate}
                  onChange={(date) => setDateRange({ ...dateRange, startDate: date })}
                  selectsStart
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  maxDate={new Date()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholderText="Start Date"
                />
                <DatePicker
                  selected={dateRange.endDate}
                  onChange={(date) => setDateRange({ ...dateRange, endDate: date })}
                  selectsEnd
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  minDate={dateRange.startDate}
                  maxDate={new Date()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholderText="End Date"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aggregation</label>
              <select
                value={aggregationPeriod}
                onChange={(e) => setAggregationPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {aggregationOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {locations.map(location => (
                  <option key={location.value} value={location.value}>{location.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crime Types</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-1">
              {crimeTypes.map((type) => (
                <div key={type.value} className="flex items-center">
                  <input
                    id={`time-series-crime-${type.value}`}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={selectedCrimeTypes.includes(type.value)}
                    onChange={() => handleCrimeTypeToggle(type.value)}
                  />
                  <label htmlFor={`time-series-crime-${type.value}`} className="ml-2 block text-sm text-gray-700">
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={handleApplyFilters}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader size="sm" className="mr-2" />
                  Loading...
                </span>
              ) : 'Apply Filters'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Crime Trends Over Time</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" />
            </div>
          ) : timeSeriesData ? (
            <div className="h-96">
              <canvas ref={chartRef}></canvas>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No trend data available</h3>
              <p className="mt-1 text-sm text-gray-500">Try changing filters or selecting a different time period.</p>
            </div>
          )}
        </div>
      </Card>
      
      {timeSeriesData && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Series Analysis Summary</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Object.entries(timeSeriesData.series).map(([crimeType, data]) => {
                const trend = calculateTrend(data);
                const total = calculateTotal(data);
                
                return (
                  <div key={crimeType} className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">{crimeType}</h4>
                    <p className="text-2xl font-bold text-gray-900">{total}</p>
                    <div className="mt-1 flex items-center">
                      {trend.increasing ? (
                        <svg className="h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`ml-1 text-sm ${trend.increasing ? 'text-red-600' : 'text-green-600'}`}>
                        {trend.value}% {trend.increasing ? 'increase' : 'decrease'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Analysis Insights</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                <li>The time series analysis covers data from {dateRange.startDate.toLocaleDateString()} to {dateRange.endDate.toLocaleDateString()}.</li>
                <li>Data is aggregated {aggregationPeriod === 'daily' ? 'daily' : 
                  aggregationPeriod === 'weekly' ? 'weekly' : 
                  aggregationPeriod === 'monthly' ? 'monthly' : 
                  aggregationPeriod === 'quarterly' ? 'quarterly' : 'yearly'}.</li>
                <li>Analysis shows trends in {selectedCrimeTypes.length > 0 ? selectedCrimeTypes.join(', ') : 'all crime types'}.</li>
                <li>Location filter: {locations.find(l => l.value === selectedLocation)?.label || 'All Locations'}</li>
                {Object.entries(timeSeriesData.series).map(([crimeType, data]) => {
                  const trend = calculateTrend(data);
                  return (
                    <li key={`insight-${crimeType}`}>
                      {crimeType} shows a {trend.value}% {trend.increasing ? 'increase' : 'decrease'} from the beginning to the end of the period.
                    </li>
                  );
                })}
              </ul>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Note:</strong> The percentage change is calculated by comparing the first and last periods in the selected date range.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TimeSeriesAnalysis;
