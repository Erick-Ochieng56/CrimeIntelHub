import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { getCrimeStats } from '../../services/crimeService';

const PALETTE = [
  '#e53e3e', '#dd6b20', '#d69e2e', '#805ad5', '#3182ce',
  '#38a169', '#6b46c1', '#718096',
];

const toChartData = (data) => {
  const topCrimes = Array.isArray(data?.top_crimes)
    ? data.top_crimes
    : Array.isArray(data?.crime_types)
      ? data.crime_types
      : [];

  if (!topCrimes.length) {
    return null;
  }

  const types = topCrimes.map(
    (item) => item.category__name || item.name || 'Unknown'
  );
  const counts = topCrimes.map((item) => item.count || 0);
  const colors = types.map((_, i) => `${PALETTE[i % PALETTE.length]}B3`);
  return { types, counts, colors };
};

const CrimeStats = ({ timeFrame, refreshKey = 0, initialStats = null }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [crimeData, setCrimeData] = useState({ types: [], counts: [], colors: [] });
  const [isLoading, setIsLoading] = useState(!initialStats);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const applyData = (data) => {
      const chart = toChartData(data);
      if (chart) {
        setCrimeData(chart);
        setError(null);
      } else {
        setError('No crime data available for the selected parameters');
        setCrimeData({ types: [], counts: [], colors: [] });
      }
    };

    // Prefer parent-loaded stats to avoid a duplicate slow request
    if (initialStats) {
      applyData(initialStats);
      setIsLoading(false);
      return undefined;
    }

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getCrimeStats({
          time_frame: timeFrame || 'allTime',
        });
        if (!cancelled) applyData(data);
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching crime stats:', err);
          setError(`Failed to load crime statistics: ${err.message}`);
          setCrimeData({ types: [], counts: [], colors: [] });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [timeFrame, refreshKey, initialStats]);

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
            borderColor: crimeData.colors.map((color) => color.replace('B3', 'FF')),
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
              callbacks: { label: (context) => `Count: ${context.parsed.y}` },
            },
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: { precision: 0 },
            },
          },
        },
      });
    }
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [crimeData]);

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
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <p className="text-gray-500 mt-2">
            Please try different parameters or try again later.
          </p>
        </div>
      </div>
    );
  }

  if (crimeData.types.length === 0) {
    return (
      <div className="flex justify-center items-center h-80">
        <p className="text-gray-500">
          No crime data available for the selected parameters.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="h-80">
        <canvas ref={chartRef} />
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {crimeData.types.map((type, index) => (
          <div key={type} className="flex items-center">
            <span
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: crimeData.colors[index].replace('B3', 'FF') }}
            />
            <span className="text-sm text-gray-600">
              {type}: {crimeData.counts[index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CrimeStats;
