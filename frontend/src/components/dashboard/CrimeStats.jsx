import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { getCrimeStats } from '../../services/crimeService';

const CrimeStats = ({ timeFrame }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [crimeData, setCrimeData] = useState({ types: [], counts: [], colors: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const params = { time_frame: timeFrame, lat: -4.0435, lng: 39.6682, radius: 500 };
        const data = await getCrimeStats(params);
        
        // Check if data and data.crime_types exist before mapping
        if (data && Array.isArray(data.crime_types)) {
          const types = data.crime_types.map(item => item.name);
          const counts = data.crime_types.map(item => item.count);
          const colors = [
            '#e53e3e', '#dd6b20', '#d69e2e', '#805ad5', '#3182ce',
            '#38a169', '#6b46c1', '#718096',
          ].slice(0, types.length).map(color => `${color.replace('#', 'rgba(').replace(')', ', 0.7)')}`);
          
          setCrimeData({ types, counts, colors });
        } else {
          console.warn('Invalid or empty crime types data received:', data);
          setError('No crime data available for the selected parameters');
          setCrimeData({ types: [], counts: [], colors: [] });
        }
      } catch (err) {
        console.error('Error fetching crime stats:', err);
        setError(`Failed to load crime statistics: ${err.message}`);
        setCrimeData({ types: [], counts: [], colors: [] });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, [timeFrame]);

  useEffect(() => {
    if (chartRef.current && crimeData.types.length > 0) {
      if (chartInstance.current) chartInstance.current.destroy();

      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: crimeData.types,
          datasets: [{
            label: 'Crime Count',
            data: crimeData.counts,
            backgroundColor: crimeData.colors,
            borderColor: crimeData.colors.map(color => color.replace('0.7', '1')),
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 50,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { display: false }, 
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
              callbacks: { label: context => `Count: ${context.parsed.y}` } 
            } 
          },
          scales: { 
            x: { grid: { display: false } }, 
            y: { 
              beginAtZero: true, 
              grid: { color: 'rgba(0, 0, 0, 0.05)' }, 
              ticks: { precision: 0 } 
            } 
          },
        },
      });
    }
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [crimeData]);

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

  if (crimeData.types.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <div className="text-center">
          <p className="text-gray-500">No crime data available for the selected parameters.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="h-80">
        <canvas ref={chartRef}></canvas>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {crimeData.types.map((type, index) => (
          <div key={type} className="flex items-center">
            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: crimeData.colors[index].replace('0.7', '1') }}></span>
            <span className="text-sm text-gray-600">{type}: {crimeData.counts[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CrimeStats;