import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Activity, Users, Clock, Filter } from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { config } from './config';

interface AnalyticsData {
  totalScenarios: number;
  aiGeneratedCount: number;
  industryBreakdown: { [key: string]: number };
  categoryBreakdown: { [key: string]: number };
  statusBreakdown: { [key: string]: number }; // New: for pie chart
  budgetTrends: { month: string; budget: number }[]; // New: for line chart
  timeSeriesData: { date: string; count: number }[];
  topPrompts: { prompt: string; usage: number }[];
  averageResponseTime: number;
  successRate: number;
}

interface DataVisualizationProps {
  className?: string;
  data?: AnalyticsData;
}

export default function DataVisualization({ className = '', data }: DataVisualizationProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  // Enhanced mock data with new fields for additional visualizations
  const mockData: AnalyticsData = useMemo(() => ({
    totalScenarios: 156,
    aiGeneratedCount: 89,
    industryBreakdown: {
      'Technology': 45,
      'Healthcare': 32,
      'Finance': 28,
      'Manufacturing': 23,
      'Retail': 18,
      'Other': 10
    },
    categoryBreakdown: {
      'Customer Onboarding': 42,
      'Project Planning': 38,
      'Resource Allocation': 35,
      'Performance Review': 25,
      'Strategic Planning': 16
    },
    statusBreakdown: { // New pie chart data
      'Hot': 25,
      'Active': 60,
      'Qualified': 40,
      'Proposal': 31
    },
    budgetTrends: [ // New line chart data
      { month: 'Jan', budget: 150000 },
      { month: 'Feb', budget: 220000 },
      { month: 'Mar', budget: 180000 },
      { month: 'Apr', budget: 250000 },
      { month: 'May', budget: 300000 },
      { month: 'Jun', budget: 280000 }
    ],
    timeSeriesData: [
      { date: '2024-01-01', count: 12 },
      { date: '2024-01-02', count: 19 },
      { date: '2024-01-03', count: 15 },
      { date: '2024-01-04', count: 23 },
      { date: '2024-01-05', count: 28 },
      { date: '2024-01-06', count: 31 },
      { date: '2024-01-07', count: 28 }
    ],
    topPrompts: [
      { prompt: 'Generate customer onboarding checklist', usage: 45 },
      { prompt: 'Create project timeline template', usage: 38 },
      { prompt: 'Design resource allocation matrix', usage: 32 },
      { prompt: 'Build performance metrics dashboard', usage: 28 },
      { prompt: 'Develop strategic planning framework', usage: 23 }
    ],
    averageResponseTime: 1.2,
    successRate: 98.5
  }), []);

  useEffect(() => {
    if (data) {
      setAnalyticsData(data);
      setLoading(false);
    } else {
      setTimeout(() => {
        setAnalyticsData(mockData);
        setLoading(false);
      }, 1000);
    }
  }, [data, mockData]);

  // Prepare data for Recharts
  const industryData = useMemo(() => 
    analyticsData ? Object.entries(analyticsData.industryBreakdown).map(([label, value]) => ({ label, value })) : []
  , [analyticsData]);

  const categoryData = useMemo(() => 
    analyticsData ? Object.entries(analyticsData.categoryBreakdown).map(([label, value]) => ({ label, value })) : []
  , [analyticsData]);

  const statusData = useMemo(() => 
    analyticsData ? Object.entries(analyticsData.statusBreakdown).map(([label, value]) => ({ label, value })) : []
  , [analyticsData]);

  const budgetData = useMemo(() => 
    analyticsData ? analyticsData.budgetTrends : []
  , [analyticsData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-24"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className={`${className} p-8 border rounded-lg text-center bg-white dark:bg-gray-800 dark:border-gray-700`}>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">No analytics available</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">Generate scenarios or sync data to see analytics here.</p>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Time Range Filter - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Analytics Dashboard
        </h3>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 px-3 py-1 w-full sm:w-auto dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Scenarios</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalScenarios}</p>
              <p className="text-xs text-green-600">+12% from last week</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI Generated</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.aiGeneratedCount}</p>
              <p className="text-xs text-green-600">{((analyticsData.aiGeneratedCount / analyticsData.totalScenarios) * 100).toFixed(1)}% of total</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.averageResponseTime}s</p>
              <p className="text-xs text-green-600">-0.3s from yesterday</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.successRate}%</p>
              <p className="text-xs text-green-600">+0.5% from last week</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Breakdown Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-4">Scenarios by Industry</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={industryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={config.charts.colors.primary} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown Pie Chart - New */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-4">Customer Status Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-4">Prompts by Category</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={config.charts.colors.secondary} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Trends Line Chart - New */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-4">Budget Trends Over Time</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={budgetData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="budget" stroke={config.charts.colors.accent} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
