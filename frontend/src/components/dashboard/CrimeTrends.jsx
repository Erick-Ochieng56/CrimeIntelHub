import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const CrimeTrends = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  // Sample data - in a real app, this would come from an API
  const trendData = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    thisYear: [165, 180, 190, 173, 183, 196, 188, 205, 198, 185, 195, 210],
    lastYear: [145, 155, 165, 162, 170, 175, 180, 182, 190, 178, 182, 195],
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
        type: 'line',
        data: {
          labels: trendData.months,
          datasets: [
            {
              label: 'This Year',
              data: trendData.thisYear,
              borderColor: 'rgba(59, 130, 246, 1)', // Blue
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              fill: true,
              pointBackgroundColor: 'rgba(59, 130, 246, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 1,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
            {
              label: 'Last Year',
              data: trendData.lastYear,
              borderColor: 'rgba(156, 163, 175, 1)', // Gray
              backgroundColor: 'rgba(156, 163, 175, 0.1)',
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.3,
              fill: true,
              pointBackgroundColor: 'rgba(156, 163, 175, 1)',
              pointBorderColor: '#fff',
              pointBorderWidth: 1,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
          ],
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
          interaction: {
            mode: 'index',
            intersect: false,
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
      <div className="mt-4 text-sm text-gray-600">
        <div className="flex justify-between">
          <div>
            <span className="font-medium">Current Year Total:</span> {trendData.thisYear.reduce((a, b) => a + b, 0)} crimes
          </div>
          <div>
            <span className="font-medium">Previous Year Total:</span> {trendData.lastYear.reduce((a, b) => a + b, 0)} crimes
          </div>
        </div>
        <div className="mt-2">
          <span className="font-medium">Year-over-Year Change:</span> {(
            ((trendData.thisYear.reduce((a, b) => a + b, 0) - trendData.lastYear.reduce((a, b) => a + b, 0)) / 
             trendData.lastYear.reduce((a, b) => a + b, 0)) * 100
          ).toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export default CrimeTrends;
