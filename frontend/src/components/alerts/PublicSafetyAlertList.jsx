import React, { useState, useEffect } from 'react';
import { getPublicSafetyAlerts, getAlertsByLocation } from '../../services/alertService';
import Card from '../common/Card';
import Loader from '../common/Loader';
import { formatDate } from '../../utils/formatters';

const PublicSafetyAlertList = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isNearMe, setIsNearMe] = useState(false);

    useEffect(() => {
        fetchPublicAlerts();
    }, []);

    const fetchPublicAlerts = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getPublicSafetyAlerts();
            setAlerts(data);
            setIsNearMe(false);
        } catch (err) {
            console.error('Error fetching public safety alerts:', err);
            setError('Failed to load public safety alerts.');
        } finally {
            setLoading(false);
        }
    };

    const handleNearMe = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const data = await getAlertsByLocation(latitude, longitude);
                    setAlerts(data);
                    setIsNearMe(true);
                    setError(null);
                } catch (err) {
                    console.error('Error fetching alerts by location:', err);
                    setError('Failed to load alerts for your location.');
                } finally {
                    setLoading(false);
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                setError('Failed to get your location. Please check your browser permissions.');
                setLoading(false);
            }
        );
    };

    const getSeverityColor = (severity) => {
        switch (severity.toLowerCase()) {
            case 'low': return 'bg-blue-100 text-blue-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'critical': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Public Safety Alerts</h3>
                <div className="flex space-x-2">
                    {isNearMe && (
                        <button
                            onClick={fetchPublicAlerts}
                            className="text-sm text-blue-600 hover:text-blue-500"
                        >
                            Show All
                        </button>
                    )}
                    <button
                        onClick={handleNearMe}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white ${isNearMe ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {isNearMe ? 'Near Me Active' : 'Near Me'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader size="md" />
                </div>
            ) : alerts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-start space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                        {alert.severity.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {formatDate(alert.start_time)}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {alert.title}
                                </p>
                                <p className="text-sm text-gray-500 line-clamp-2">
                                    {alert.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500">No active public safety alerts found.</p>
                </div>
            )}
        </div>
    );
};

export default PublicSafetyAlertList;
