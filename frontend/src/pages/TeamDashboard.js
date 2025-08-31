import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    CalendarIcon,
    UserGroupIcon,
    ChartBarIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    FunnelIcon,
    RefreshCwIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

// Register Chart.js components
ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, BarElement,
    Title, Tooltip, Legend, ArcElement
);

const TeamDashboard = () => {
    const [filters, setFilters] = useState({
        startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        projectId: '',
        members: [],
        status: ''
    });

    const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch team results
    const { data: teamResults, isLoading, error, refetch } = useQuery(
        ['teamResults', filters],
        () => fetchTeamResults(filters),
        {
            refetchInterval: 30000, // Refresh every 30 seconds
            staleTime: 10000,
        }
    );

    // Fetch team analytics
    const { data: teamAnalytics } = useQuery(
        ['teamAnalytics', filters],
        () => fetchTeamAnalytics(filters),
        {
            refetchInterval: 60000, // Refresh every minute
            staleTime: 30000,
        }
    );

    // Fetch team performance
    const { data: teamPerformance } = useQuery(
        ['teamPerformance', filters],
        () => fetchTeamPerformance(filters),
        {
            refetchInterval: 120000, // Refresh every 2 minutes
            staleTime: 60000,
        }
    );

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refetch();
            toast.success('Dashboard refreshed successfully!');
        } catch (error) {
            toast.error('Failed to refresh dashboard');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleTimeRangeChange = (range) => {
        setSelectedTimeRange(range);
        const endDate = new Date();
        let startDate = new Date();

        switch (range) {
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 30);
        }

        setFilters(prev => ({
            ...prev,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd')
        }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
                    <p className="text-gray-600 mb-4">{error.message}</p>
                    <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const summary = teamResults?.data?.summary || {};
    const results = teamResults?.data?.results || [];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Team Dashboard</h1>
                        <p className="text-gray-600 mt-2">
                            Consolidated QA results from all team members
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <RefreshCwIcon className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <div className="flex items-center space-x-4 mb-4">
                    <FunnelIcon className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Quick Time Ranges */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quick Range
                        </label>
                        <select
                            value={selectedTimeRange}
                            onChange={(e) => handleTimeRangeChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                            <option value="1y">Last year</option>
                        </select>
                    </div>

                    {/* Project Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project
                        </label>
                        <select
                            value={filters.projectId}
                            onChange={(e) => handleFilterChange('projectId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Projects</option>
                            {/* Add project options dynamically */}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                            <option value="skipped">Skipped</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <SummaryCard
                    title="Total Tests"
                    value={summary.total || 0}
                    icon={ChartBarIcon}
                    color="blue"
                />
                <SummaryCard
                    title="Pass Rate"
                    value={`${summary.passRate || 0}%`}
                    icon={CheckCircleIcon}
                    color="green"
                />
                <SummaryCard
                    title="Fail Rate"
                    value={`${summary.failRate || 0}%`}
                    icon={XCircleIcon}
                    color="red"
                />
                <SummaryCard
                    title="Suite Health"
                    value={`${summary.suiteHealth || 0}%`}
                    icon={ChartBarIcon}
                    color="purple"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Status Distribution */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Status Distribution</h3>
                    <div className="h-64">
                        <Doughnut
                            data={{
                                labels: ['Passed', 'Failed', 'Skipped', 'Blocked'],
                                datasets: [{
                                    data: [
                                        summary.passed || 0,
                                        summary.failed || 0,
                                        summary.skipped || 0,
                                        summary.blocked || 0
                                    ],
                                    backgroundColor: [
                                        '#10B981',
                                        '#EF4444',
                                        '#F59E0B',
                                        '#6B7280'
                                    ],
                                    borderWidth: 2,
                                    borderColor: '#ffffff'
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom'
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function (context) {
                                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Daily Trends */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Test Execution Trends</h3>
                    <div className="h-64">
                        <Line
                            data={{
                                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                                datasets: [{
                                    label: 'Tests Executed',
                                    data: [65, 78, 90, 81, 56, 55, 40],
                                    borderColor: '#3B82F6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    tension: 0.4
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* New Feature Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Intent Capturing */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">🎯</span>
                        Test Intent & Purpose
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div>
                                <p className="font-medium text-blue-900">Login Functionality</p>
                                <p className="text-sm text-blue-700">Validates user authentication flow</p>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Auth Tests
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div>
                                <p className="font-medium text-green-900">Payment Processing</p>
                                <p className="text-sm text-green-700">Ensures secure transaction handling</p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                E2E Tests
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                            <div>
                                <p className="font-medium text-purple-900">API Endpoints</p>
                                <p className="text-sm text-purple-700">Validates backend service contracts</p>
                            </div>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                API Tests
                            </span>
                        </div>
                    </div>
                </div>

                {/* Suite Health Monitoring */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">🏥</span>
                        Suite Health Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">E2E Test Suite</span>
                            <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                                </div>
                                <span className="text-sm font-medium text-green-600">85%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Unit Test Suite</span>
                            <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                                </div>
                                <span className="text-sm font-medium text-green-600">92%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">API Test Suite</span>
                            <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                                </div>
                                <span className="text-sm font-medium text-yellow-600">78%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Performance Tests</span>
                            <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                                </div>
                                <span className="text-sm font-medium text-red-600">65%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Flaky Test Patterns */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🔄</span>
                    Flaky Test Pattern Detection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium text-gray-800 mb-3">Intermittent Failures</h4>
                        <div className="space-y-3">
                            <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-red-800">Login Test</span>
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                        3 failures
                                    </span>
                                </div>
                                <p className="text-xs text-red-600 mt-1">Fails randomly during peak hours</p>
                            </div>
                            <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-yellow-800">Payment Test</span>
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                        2 failures
                                    </span>
                                </div>
                                <p className="text-xs text-yellow-600 mt-1">Timeout issues on slow networks</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-800 mb-3">Root Cause Analysis</h4>
                        <div className="space-y-3">
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-800">Network Latency</p>
                                <p className="text-xs text-blue-600">High network latency causing timeouts</p>
                                <div className="mt-2">
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        Recommendation: Increase timeout values
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                                <p className="text-sm font-medium text-green-800">Resource Contention</p>
                                <p className="text-xs text-green-600">Shared resources causing race conditions</p>
                                <div className="mt-2">
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        Recommendation: Add resource isolation
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Results Table */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Test Results</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Test Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Team Member
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Project
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Execution Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {results.slice(0, 10).map((result, index) => (
                                <tr key={result.id || index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {result.test_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={result.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.team_member_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.project_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.execution_time}s
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(result.created_at), 'MMM dd, yyyy HH:mm')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {results.length === 0 && (
                    <div className="text-center py-8">
                        <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No test results found for the selected filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Summary Card Component
const SummaryCard = ({ title, value, icon: Icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500'
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
                <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-10`}>
                    <Icon className={`h-6 w-6 ${colorClasses[color].replace('bg-', 'text-')}`} />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
    const statusConfig = {
        passed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
        failed: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
        skipped: { color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon },
        blocked: { color: 'bg-gray-100 text-gray-800', icon: InformationCircleIcon }
    };

    const config = statusConfig[status] || statusConfig.failed;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="h-3 w-3 mr-1" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

// API functions
const fetchTeamResults = async (filters) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
            queryParams.append(key, value);
        }
    });

    const response = await fetch(`/api/v1/team-results?${queryParams}`);
    if (!response.ok) {
        throw new Error('Failed to fetch team results');
    }
    return response.json();
};

const fetchTeamAnalytics = async (filters) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
            queryParams.append(key, value);
        }
    });

    const response = await fetch(`/api/v1/team-results/analytics?${queryParams}`);
    if (!response.ok) {
        throw new Error('Failed to fetch team analytics');
    }
    return response.json();
};

const fetchTeamPerformance = async (filters) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
            queryParams.append(key, value);
        }
    });

    const response = await fetch(`/api/v1/team-results/performance?${queryParams}`);
    if (!response.ok) {
        throw new Error('Failed to fetch team performance');
    }
    return response.json();
};

export default TeamDashboard;
