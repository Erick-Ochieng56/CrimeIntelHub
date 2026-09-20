import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CrimeStats from './CrimeStats';
import CrimeTrends from './CrimeTrends';
import Card from '../common/Card';
import Loader from '../common/Loader';
import { getCrimeStats, getCrimes } from '../../services/crimeService';
import { getCurrentHotspots } from '../../services/crimeService';
import { getAlerts } from '../../services/alertService';
import { getReportHistory } from '../../services/reportService';

/** UI value → API time_frame (must match backend crimes.views.stats/trends). */
const TIME_FRAME_MAP = {
  last24Hours: 'last24Hours',
  lastWeek: 'last7Days',
  lastMonth: 'last30Days',
  lastYear: 'lastYear',
  allTime: 'allTime',
};

const pctChange = (current, previous) => {
  if (previous == null || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const Dashboard = () => {
  const [timeFrame, setTimeFrame] = useState('allTime');
  const [stats, setStats] = useState(null);
  const [hotspotCount, setHotspotCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [recentCrimes, setRecentCrimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const apiTimeFrame = TIME_FRAME_MAP[timeFrame] || 'allTime';

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      getCrimeStats({ time_frame: apiTimeFrame }),
      getCrimes({ page: 1, limit: 8 }),
      getCurrentHotspots(),
      getAlerts(),
      getReportHistory(),
    ]);

    const [statsResult, crimesResult, hotspotsResult, alertsResult, reportsResult] =
      results;

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value);
    } else {
      console.error('Dashboard stats failed:', statsResult.reason);
      setError(statsResult.reason?.message || 'Failed to load crime statistics');
    }

    if (crimesResult.status === 'fulfilled') {
      setRecentCrimes(crimesResult.value?.results || []);
    }

    if (hotspotsResult.status === 'fulfilled') {
      const hotspots = hotspotsResult.value;
      const hotspotList = Array.isArray(hotspots)
        ? hotspots
        : hotspots?.results || hotspots?.features || [];
      setHotspotCount(hotspotList.length);
    } else {
      setHotspotCount(0);
    }

    if (alertsResult.status === 'fulfilled') {
      const alerts = alertsResult.value;
      const alertList = Array.isArray(alerts) ? alerts : alerts?.results || [];
      setAlertCount(alertList.filter((a) => a.is_active !== false).length);
    } else {
      setAlertCount(0);
    }

    if (reportsResult.status === 'fulfilled') {
      const reports = reportsResult.value;
      const reportList = Array.isArray(reports)
        ? reports
        : reports?.results || [];
      setReportCount(reportList.length);
    } else {
      setReportCount(0);
    }

    setIsLoading(false);
  }, [apiTimeFrame]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshKey]);

  const kpiCards = useMemo(() => {
    const total = stats?.total_crimes ?? 0;
    const prevTotal = stats?.previous_total_crimes ?? 0;
    const totalDelta = pctChange(total, prevTotal);
    const violent = stats?.violent_crimes ?? 0;

    return [
      {
        key: 'total',
        label: 'Total Crimes',
        value: total.toLocaleString(),
        delta: apiTimeFrame === 'allTime' ? null : totalDelta,
        tone: totalDelta <= 0 ? 'green' : 'red',
        caption:
          apiTimeFrame === 'allTime'
            ? stats?.as_of
              ? `all records through ${stats.as_of}`
              : 'all records in database'
            : 'vs prior period',
        iconBg: 'bg-blue-100 text-blue-600',
      },
      {
        key: 'hotspots',
        label: 'Active Hotspots',
        value: hotspotCount.toLocaleString(),
        delta: null,
        tone: 'red',
        caption: `${violent.toLocaleString()} violent in period`,
        iconBg: 'bg-red-100 text-red-600',
      },
      {
        key: 'alerts',
        label: 'Active Alerts',
        value: alertCount.toLocaleString(),
        delta: null,
        tone: 'yellow',
        caption: 'your alert rules',
        iconBg: 'bg-yellow-100 text-yellow-600',
      },
      {
        key: 'reports',
        label: 'Saved Reports',
        value: reportCount.toLocaleString(),
        delta: null,
        tone: 'green',
        caption: 'in your history',
        iconBg: 'bg-green-100 text-green-600',
      },
    ];
  }, [stats, hotspotCount, alertCount, reportCount, apiTimeFrame]);

  const handleExport = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crime-stats-${apiTimeFrame}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-2 md:mt-0 flex space-x-2">
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
          >
            <option value="last24Hours">Last 24 Hours</option>
            <option value="lastWeek">Last Week</option>
            <option value="lastMonth">Last Month</option>
            <option value="lastYear">Last Year</option>
            <option value="allTime">All Time</option>
          </select>
          <button
            type="button"
            className="btn btn-primary flex items-center"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={isLoading}
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-secondary flex items-center"
            onClick={handleExport}
            disabled={!stats}
          >
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {kpiCards.map((card) => (
          <Card key={card.key} className="lg:col-span-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-md ${card.iconBg}`}>
                  <div className="h-8 w-8 flex items-center justify-center font-bold">
                    {card.key === 'total' ? 'Σ' : card.key[0].toUpperCase()}
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.label}
                    </dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">
                        {isLoading ? '—' : card.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  {card.delta != null ? (
                    <span
                      className={
                        card.tone === 'green' ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {card.delta > 0 ? '+' : ''}
                      {card.delta}%
                    </span>
                  ) : (
                    <span className="text-gray-500">{card.caption}</span>
                  )}
                  {card.delta != null && (
                    <span className="text-gray-500">{card.caption}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Crime Statistics by Type
            </h2>
            <CrimeStats
              timeFrame={apiTimeFrame}
              refreshKey={refreshKey}
              initialStats={stats}
            />
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Crime Trends Over Time
            </h2>
            <CrimeTrends timeFrame={apiTimeFrame} refreshKey={refreshKey} />
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Crime Reports
            </h2>
            <Link
              to="/map"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View map
            </Link>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Crime Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Case
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentCrimes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        No recent crimes found. Seed data or adjust filters.
                      </td>
                    </tr>
                  ) : (
                    recentCrimes.map((crime) => (
                      <tr key={crime.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {crime.date
                            ? new Date(
                                `${crime.date}${crime.time ? `T${crime.time}` : ''}`
                              ).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {crime.type || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {crime.block_address || crime.district || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {crime.case_number || crime.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            to={
                              crime.latitude != null && crime.longitude != null
                                ? `/map?lat=${crime.latitude}&lng=${crime.longitude}&zoom=15`
                                : '/map'
                            }
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Map
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
