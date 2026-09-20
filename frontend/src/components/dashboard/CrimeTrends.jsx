import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { getCrimeTrends } from '../../services/crimeService';

const CrimeTrends = ({ timeFrame, refreshKey = 0 }) => {
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

        const params = {
          time_frame: timeFrame || 'allTime',
          months: timeFrame === 'allTime' ? 96 : 12,
        };

        const data = await getCrimeTrends(params);

        if (
          data?.labels?.length > 0 &&
          Array.isArray(data.datasets) &&
          data.datasets.length > 0
        ) {
          setTrendsData(data);
        } else if (data?.rawData?.length > 0) {
          setTrendsData({
            labels: data.rawData.map((item) => item.date),
            datasets: [
              {
                label: 'Total',
                data: data.rawData.map((item) => item.total || 0),
                borderColor: '#3182ce',
                backgroundColor: '#3182ce20',
                fill: false,
                tension: 0.4,
              },
              {
                label: 'Violent',
                data: data.rawData.map((item) => item.violent || 0),
                borderColor: '#e53e3e',
                backgroundColor: '#e53e3e20',
                fill: false,
                tension: 0.4,
              },
            ],
          });
        } else if (data?.trends?.length > 0) {
          const labels = data.trends.map((item) => item.period || item.date);
          setTrendsData({
            labels,
            datasets: [
              {
                label: 'Total',
                data: data.trends.map((item) => item.total || 0),
                borderColor: '#3182ce',
                backgroundColor: '#3182ce20',
                fill: false,
                tension: 0.4,
              },
              {
                label: 'Violent',
                data: data.trends.map((item) => item.violent || 0),
                borderColor: '#e53e3e',
                backgroundColor: '#e53e3e20',
                fill: false,
                tension: 0.4,
              },
            ],
          });
        } else {
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
  }, [timeFrame, refreshKey]);

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
            },
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              beginAtZero: true,
              ticks: { precision: 0 },
            },
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-80">
        <p className="text-red-500 text-center">{error}</p>
      </div>
    );
  }

  if (trendsData.labels.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <p className="text-gray-500">No trend data available.</p>
      </div>
    );
  }

  return (
    <div className="h-80">
      <canvas ref={chartRef} />
    </div>
  );
};

export default CrimeTrends;
