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
    ArcElement,
    RadialLinearScale,
    Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Radar, PolarArea } from 'react-chartjs-2';
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
    RefreshCwIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    CogIcon,
    BellIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

// Register Chart.js components
ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, BarElement,
    Title, Tooltip, Legend, ArcElement, RadialLinearScale, Filler
);

const AdvancedDashboard = () => {
    const [filters, setFilters] = useState({
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        projectId: '',
        members: [],
        status: '',
        framework: '',
        environment: ''
    });

    const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState('overview'); // overview, detailed, comparison
    const [selectedMetrics, setSelectedMetrics] = useState(['successRate', 'executionTime', 'testCount']);

    // Fetch data from cloud storage backend
    const { data: teamResults, isLoading, error, refetch } = useQuery(
        ['teamResults', filters],
        () => fetchTeamResults(filters),
        {
            refetchInterval: 30000, // Refresh every 30 seconds
            staleTime: 10000,
        }
    );

    const { data: analytics } = useQuery(
        ['analytics', filters],
        () => fetchAnalytics(filters),
        {
            refetchInterval: 60000,
            staleTime: 30000,
        }
    );

    const { data: trends } = useQuery(
        ['trends', filters],
        () => fetchTrends(filters),
        {
            refetchInterval: 120000,
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
            {/* Header with Rich Controls */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Advanced QA Dashboard</h1>
                        <p className="text-gray-600 mt-2">
                            Rich analytics powered by cloud storage - always available, always updated
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* View Mode Selector */}
                        <div className="flex bg-white rounded-lg shadow-sm p-1">
                            <button
                                onClick={() => setViewMode('overview')}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'overview'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setViewMode('detailed')}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'detailed'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Detailed
                            </button>
                            <button
                                onClick={() => setViewMode('comparison')}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'comparison'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Comparison
                            </button>
                        </div>

                        {/* Refresh Button */}
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

                {/* Storage Provider Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                        <div>
                            <p className="text-sm font-medium text-blue-900">
                                Cloud Storage Backend Active
                            </p>
                            <p className="text-sm text-blue-700">
                                Your dashboard is powered by cloud storage - no server dependencies, always available!
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <div className="flex items-center space-x-4 mb-4">
                    <FunnelIcon className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setFilters({
                                startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                                endDate: format(new Date(), 'yyyy-MM-dd'),
                                projectId: '',
                                members: [],
                                status: '',
                                framework: '',
                                environment: ''
                            })}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                            <option value="web-app">Web Application</option>
                            <option value="mobile-app">Mobile App</option>
                            <option value="api-testing">API Testing</option>
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

                    {/* Framework Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Framework
                        </label>
                        <select
                            value={filters.framework}
                            onChange={(e) => handleFilterChange('framework', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Frameworks</option>
                            <option value="playwright">Playwright</option>
                            <option value="selenium">Selenium</option>
                            <option value="cypress">Cypress</option>
                            <option value="postman">Postman</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Rich Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <RichSummaryCard
                    title="Total Tests"
                    value={summary.total || 0}
                    icon={ChartBarIcon}
                    color="blue"
                    trend={trends?.testCount?.trend || 0}
                    trendLabel="vs last period"
                />
                <RichSummaryCard
                    title="Success Rate"
                    value={`${summary.successRate || 0}%`}
                    icon={CheckCircleIcon}
                    color="green"
                    trend={trends?.successRate?.trend || 0}
                    trendLabel="vs last period"
                />
                <RichSummaryCard
                    title="Team Members"
                    value={summary.teamMemberCount || 0}
                    icon={UserGroupIcon}
                    color="purple"
                    trend={trends?.teamMembers?.trend || 0}
                    trendLabel="vs last period"
                />
                <RichSummaryCard
                    title="Avg Execution Time"
                    value={`${summary.avgExecutionTime || 0}s`}
                    icon={ClockIcon}
                    color="orange"
                    trend={trends?.executionTime?.trend || 0}
                    trendLabel="vs last period"
                />
            </div>

            {/* Rich Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Enhanced Status Distribution */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Test Status Distribution</h3>
                        <div className="flex items-center space-x-2">
                            <button className="text-sm text-blue-600 hover:text-blue-800">View Details</button>
                        </div>
                    </div>
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
                                    borderColor: '#ffffff',
                                    hoverOffset: 4
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            usePointStyle: true,
                                            padding: 20
                                        }
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

                {/* Enhanced Daily Trends */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Daily Test Execution Trends</h3>
                        <div className="flex items-center space-x-2">
                            <TrendingUpIcon className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">+12% this week</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <Line
                            data={{
                                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                                datasets: [{
                                    label: 'Tests Executed',
                                    data: [65, 78, 90, 81, 56, 55, 40],
                                    borderColor: '#3B82F6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    tension: 0.4,
                                    fill: true,
                                    pointBackgroundColor: '#3B82F6',
                                    pointBorderColor: '#ffffff',
                                    pointBorderWidth: 2,
                                    pointRadius: 6
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
                                        beginAtZero: true,
                                        grid: {
                                            color: 'rgba(0, 0, 0, 0.1)'
                                        }
                                    },
                                    x: {
                                        grid: {
                                            color: 'rgba(0, 0, 0, 0.1)'
                                        }
                                    }
                                },
                                elements: {
                                    point: {
                                        hoverRadius: 8
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Additional Rich Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Team Performance Radar Chart */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance Overview</h3>
                    <div className="h-64">
                        <Radar
                            data={{
                                labels: ['Success Rate', 'Execution Speed', 'Test Coverage', 'Bug Detection', 'Team Collaboration'],
                                datasets: [{
                                    label: 'Current Period',
                                    data: [85, 78, 92, 88, 95],
                                    borderColor: '#8B5CF6',
                                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                    borderWidth: 2,
                                    pointBackgroundColor: '#8B5CF6',
                                    pointBorderColor: '#ffffff',
                                    pointBorderWidth: 2
                                }, {
                                    label: 'Previous Period',
                                    data: [80, 75, 88, 85, 90],
                                    borderColor: '#10B981',
                                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                    borderWidth: 2,
                                    pointBackgroundColor: '#10B981',
                                    pointBorderColor: '#ffffff',
                                    pointBorderWidth: 2
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom'
                                    }
                                },
                                scales: {
                                    r: {
                                        beginAtZero: true,
                                        max: 100,
                                        ticks: {
                                            stepSize: 20
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Framework Performance Comparison */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Framework Performance</h3>
                    <div className="h-64">
                        <Bar
                            data={{
                                labels: ['Playwright', 'Selenium', 'Cypress', 'Postman'],
                                datasets: [{
                                    label: 'Success Rate (%)',
                                    data: [92, 85, 88, 95],
                                    backgroundColor: [
                                        'rgba(59, 130, 246, 0.8)',
                                        'rgba(16, 185, 129, 0.8)',
                                        'rgba(245, 158, 11, 0.8)',
                                        'rgba(139, 92, 246, 0.8)'
                                    ],
                                    borderColor: [
                                        '#3B82F6',
                                        '#10B981',
                                        '#F59E0B',
                                        '#8B5CF6'
                                    ],
                                    borderWidth: 2
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
                                        beginAtZero: true,
                                        max: 100,
                                        grid: {
                                            color: 'rgba(0, 0, 0, 0.1)'
                                        }
                                    },
                                    x: {
                                        grid: {
                                            display: false
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Enhanced Results Table */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Test Results</h3>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search tests..."
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button className="text-sm text-blue-600 hover:text-blue-800">Export Data</button>
                    </div>
                </div>

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
                                    Framework
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Execution Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {results.slice(0, 10).map((result, index) => (
                                <tr key={result.id || index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="text-sm font-medium text-gray-900">
                                                {result.test_name}
                                            </div>
                                            {result.tags && (
                                                <div className="ml-2 flex space-x-1">
                                                    {result.tags.split(',').slice(0, 2).map((tag, tagIndex) => (
                                                        <span key={tagIndex} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <EnhancedStatusBadge status={result.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <UserGroupIcon className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {result.team_member_name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {result.project_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {result.framework}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex items-center">
                                            <ClockIcon className="h-4 w-4 text-gray-500 mr-1" />
                                            {result.execution_time}s
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(result.created_at), 'MMM dd, yyyy HH:mm')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button className="text-blue-600 hover:text-blue-900">
                                                <EyeIcon className="h-4 w-4" />
                                            </button>
                                            <button className="text-gray-600 hover:text-gray-900">
                                                <CogIcon className="h-4 w-4" />
                                            </button>
                                        </div>
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

// Enhanced Summary Card Component
const RichSummaryCard = ({ title, value, icon: Icon, color, trend, trendLabel }) => {
    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500'
    };

    const isPositiveTrend = trend > 0;
    const trendIcon = isPositiveTrend ? TrendingUpIcon : TrendingDownIcon;
    const trendColor = isPositiveTrend ? 'text-green-600' : 'text-red-600';

    return (
        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-10`}>
                        <Icon className={`h-6 w-6 ${colorClasses[color].replace('bg-', 'text-')}`} />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">{title}</p>
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                    </div>
                </div>
                {trend !== 0 && (
                    <div className={`flex items-center ${trendColor}`}>
                        <trendIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">
                            {isPositiveTrend ? '+' : ''}{trend}%
                        </span>
                    </div>
                )}
            </div>
            {trend !== 0 && (
                <p className="text-xs text-gray-500 mt-2">{trendLabel}</p>
            )}
        </div>
    );
};

// Enhanced Status Badge Component
const EnhancedStatusBadge = ({ status }) => {
    const statusConfig = {
        passed: {
            color: 'bg-green-100 text-green-800',
            icon: CheckCircleIcon,
            description: 'Test passed successfully'
        },
        failed: {
            color: 'bg-red-100 text-red-800',
            icon: XCircleIcon,
            description: 'Test failed - needs attention'
        },
        skipped: {
            color: 'bg-yellow-100 text-yellow-800',
            icon: ExclamationTriangleIcon,
            description: 'Test was skipped'
        },
        blocked: {
            color: 'bg-gray-100 text-gray-800',
            icon: InformationCircleIcon,
            description: 'Test execution blocked'
        }
    };

    const config = statusConfig[status] || statusConfig.failed;
    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} cursor-help`}
            title={config.description}
        >
            <Icon className="h-3 w-3 mr-1" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

// API functions (these would connect to your cloud storage backend)
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

const fetchAnalytics = async (filters) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
            queryParams.append(key, value);
        }
    });

    const response = await fetch(`/api/v1/team-results/analytics?${queryParams}`);
    if (!response.ok) {
        throw new Error('Failed to fetch analytics');
    }
    return response.json();
};

const fetchTrends = async (filters) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
            queryParams.append(key, value);
        }
    });

    const response = await fetch(`/api/v1/team-results/trends?${queryParams}`);
    if (!response.ok) {
        throw new Error('Failed to fetch trends');
    }
    return response.json();
};

export default AdvancedDashboard;
