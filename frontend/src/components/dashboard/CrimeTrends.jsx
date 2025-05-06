import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { getCrimeTrends } from '../../services/crimeService';

const CrimeTrends = ({ timeFrame }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [trendsData, setTrendsData] = useState({ labels: [], datasets: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Include lat and lng parameters based on your location needs
        // These are just example coordinates - update with your actual default location
        const params = { 
          time_frame: timeFrame, 
          lat: -4.0435, 
          lng: 39.6682, 
          radius: 5,  // Expressed in km
          months: 6   // Request 6 months of data
        };
        
        console.log('Requesting crime trends with params:', params);
        const data = await getCrimeTrends(params);
        console.log('Received crime trends data:', data);
        
        // Check if we have valid data
        if (data && data.labels && Array.isArray(data.labels) && data.labels.length > 0 && 
            data.datasets && Array.isArray(data.datasets) && data.datasets.length > 0) {
          // Data is already in Chart.js format
          setTrendsData(data);
        } else if (data && data.trends && Array.isArray(data.trends) && data.trends.length > 0) {
          // We have trends data but need to format it for Chart.js
          // Extract time periods as labels
          const labels = data.trends.map(item => item.period || item.date);
          
          // Extract datasets
          const datasets = [];
          
          // If we have nested crime_types in each trend item
          if (data.trends[0].crime_types && Array.isArray(data.trends[0].crime_types)) {
            // Extract unique crime types
            const crimeTypes = [...new Set(
              data.trends.flatMap(trend => 
                trend.crime_types.map(ct => ct.name)
              )
            )];
            
            // Create a dataset for each crime type
            crimeTypes.forEach((crimeType, index) => {
              const colorIndex = index % 8;
              const colors = [
                '#e53e3e', '#dd6b20', '#d69e2e', '#805ad5', 
                '#3182ce', '#38a169', '#6b46c1', '#718096'
              ];
              
              const values = data.trends.map(trend => {
                const typeData = trend.crime_types.find(ct => ct.name === crimeType);
                return typeData ? typeData.count : 0;
              });
              
              datasets.push({
                label: crimeType,
                data: values,
                borderColor: colors[colorIndex],
                backgroundColor: `${colors[colorIndex]}20`,
                fill: false,
                tension: 0.4,
                borderWidth: 2,
                pointBackgroundColor: colors[colorIndex],
                pointRadius: 3,
              });
            });
          } else {
            // Handle flat trend data with properties like total, violent, property, arrests
            const dataKeys = Object.keys(data.trends[0]).filter(key => 
              key !== 'date' && key !== 'period' && typeof data.trends[0][key] === 'number'
            );
            
            const colors = [
              '#3182ce', '#e53e3e', '#38a169', '#805ad5', 
              '#d69e2e', '#dd6b20', '#6b46c1', '#718096'
            ];
            
            dataKeys.forEach((key, index) => {
              datasets.push({
                label: key.charAt(0).toUpperCase() + key.slice(1),
                data: data.trends.map(trend => trend[key]),
                borderColor: colors[index % colors.length],
                backgroundColor: `${colors[index % colors.length]}20`,
                fill: false,
                tension: 0.4,
                borderWidth: 2,
                pointBackgroundColor: colors[index % colors.length],
                pointRadius: 3,
              });
            });
          }
          
          setTrendsData({ labels, datasets });
        } else {
          console.warn('Invalid or empty trends data received:', data);
          setError('No trend data available for the selected parameters');
          setTrendsData({ labels: [], datasets: [] });
        }
      } catch (err) {
        console.error('Error fetching crime trends:', err);
        setError(`Failed to load crime trends: ${err.message}`);
        setTrendsData({ labels: [], datasets: [] });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrends();
  }, [timeFrame]);

  useEffect(() => {
    if (chartRef.current && trendsData.labels.length > 0) {
      if (chartInstance.current) chartInstance.current.destroy();

      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: trendsData.labels,
          datasets: trendsData.datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                usePointStyle: true,
                pointStyle: 'circle',
              },
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 4,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 12 },
            },
          },
          scales: {
            x: {
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: { precision: 0 }
            }
          },
        },
      });
    }
    
    return () => { 
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [trendsData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-80">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <p className="text-gray-500 mt-2">Please try different parameters or try again later.</p>
        </div>
      </div>
    );
  }

  if (trendsData.labels.length === 0 || trendsData.datasets.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <div className="text-center">
          <p className="text-gray-500">No trend data available for the selected parameters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-80">
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default CrimeTrends;