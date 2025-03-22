import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const CrimeStats = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  // Sample data - in a real app, this would come from an API
  const crimeData = {
    types: ['Theft', 'Assault', 'Burglary', 'Robbery', 'Vandalism', 'Drug', 'Fraud', 'Other'],
    counts: [423, 189, 257, 112, 187, 98, 134, 201],
    colors: [
      'rgba(229, 62, 62, 0.7)',    // Red for Theft
      'rgba(221, 107, 32, 0.7)',   // Orange for Assault
      'rgba(214, 158, 46, 0.7)',   // Yellow for Burglary
      'rgba(128, 90, 213, 0.7)',   // Purple for Robbery
      'rgba(49, 130, 206, 0.7)',   // Blue for Vandalism
      'rgba(56, 161, 105, 0.7)',   // Green for Drug
      'rgba(107, 70, 193, 0.7)',   // Indigo for Fraud
      'rgba(113, 128, 150, 0.7)',  // Gray for Other
    ],
  };
  
  useEffect(() => {
    if (chartRef.current) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      
      // Create the chart
      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: crimeData.types,
          datasets: [
            {
              label: 'Crime Count',
              data: crimeData.counts,
              backgroundColor: crimeData.colors,
              borderColor: crimeData.colors.map(color => color.replace('0.7', '1')),
              borderWidth: 1,
              borderRadius: 4,
              maxBarThickness: 50,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
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
              titleFont: {
                size: 14,
                weight: 'bold',
              },
              bodyFont: {
                size: 12,
              },
              callbacks: {
                label: function(context) {
                  return `Count: ${context.parsed.y}`;
                }
              }
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)',
              },
              ticks: {
                precision: 0,
              },
            },
          },
        },
      });
    }
    
    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);
  
  return (
    <div>
      <div className="h-80">
        <canvas ref={chartRef}></canvas>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {crimeData.types.map((type, index) => (
          <div key={type} className="flex items-center">
            <span
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: crimeData.colors[index].replace('0.7', '1') }}
            ></span>
            <span className="text-sm text-gray-600">{type}: {crimeData.counts[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CrimeStats;
