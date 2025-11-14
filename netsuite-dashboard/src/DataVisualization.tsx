// Data Visualization Component with Charts
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, PieChart, TrendingUp, Activity, Users, Clock, Filter } from 'lucide-react';
import { config } from './config';

interface AnalyticsData {
  totalScenarios: number;
  aiGeneratedCount: number;
  industryBreakdown: { [key: string]: number };
  categoryBreakdown: { [key: string]: number };
  timeSeriesData: { date: string; count: number }[];
  topPrompts: { prompt: string; usage: number }[];
  averageResponseTime: number;
  successRate: number;
}

interface ChartProps {
  data: any[];
  title: string;
  type: 'bar' | 'pie' | 'line' | 'area';
  color?: string;
  height?: number;
}

// Simple chart components (placeholder for full chart library)
const SimpleBarChart: React.FC<ChartProps> = ({ data, title, color = config.charts.colors.primary, height = 200 }) => {
  const maxValue = Math.max(...data.map(d => d.value || 0));
  
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      <div className="space-y-1" style={{ height: `${height}px` }}>
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="w-20 text-xs text-gray-600 truncate">{item.label}</div>
            <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
              <div
                className="h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: color
                }}
              >
                <span className="text-xs text-white font-medium">{item.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimplePieChart: React.FC<ChartProps> = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const colors = [
    config.charts.colors.primary,
    config.charts.colors.secondary,
    config.charts.colors.accent,
    config.charts.colors.warning,
    config.charts.colors.info,
    config.charts.colors.danger
  ];
  
  let cumulativePercentage = 0;
  
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      <div className="flex items-center space-x-4">
        <div className="w-32 h-32 relative">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="8"
            />
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const strokeDasharray = `${(percentage / 100) * 251.2} 251.2`;
              const strokeDashoffset = -(cumulativePercentage / 100) * 251.2;
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
        </div>
        <div className="flex-1 space-y-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-xs text-gray-600">{item.label}</span>
              <span className="text-xs font-medium text-gray-800">{item.value}</span>
              <span className="text-xs text-gray-500">
                ({((item.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, value, change, icon, color = config.charts.colors.primary }) => (
  <div className="bg-white rounded-lg border p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p className="text-xs text-gray-500 mt-1">{change}</p>
        )}
      </div>
      <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <div style={{ color }}>{icon}</div>
      </div>
    </div>
  </div>
);

interface DataVisualizationProps {
  className?: string;
  data?: AnalyticsData;
}

export default function DataVisualization({ className = '', data }: DataVisualizationProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  // Mock data for demonstration
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
    // Use provided data or mock data
    if (data) {
      setAnalyticsData(data);
      setLoading(false);
    } else {
      // Simulate API call
      setTimeout(() => {
        setAnalyticsData(mockData);
        setLoading(false);
      }, 1000);
    }
  }, [data, mockData]);

  // Prepare chart data
  const industryChartData = useMemo(() => 
    analyticsData ? Object.entries(analyticsData.industryBreakdown).map(([label, value]) => ({ label, value })) : []
  , [analyticsData]);

  const categoryChartData = useMemo(() => 
    analyticsData ? Object.entries(analyticsData.categoryBreakdown).map(([label, value]) => ({ label, value })) : []
  , [analyticsData]);

  const topPromptsData = useMemo(() => 
    analyticsData ? analyticsData.topPrompts.map(item => ({ label: item.prompt.slice(0, 20) + '...', value: item.usage })) : []
  , [analyticsData]);

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} text-center py-8`}>
        <div className="text-red-500 mb-2">
          <Activity className="w-8 h-8 mx-auto" />
        </div>
        <p className="text-gray-600">Failed to load analytics data</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  return (
    <div className={className}>
      {/* Time Range Filter */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Analytics Dashboard
        </h3>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Scenarios"
          value={analyticsData.totalScenarios}
          change="+12% from last week"
          icon={<Users className="w-5 h-5" />}
          color={config.charts.colors.primary}
        />
        <MetricCard
          title="AI Generated"
          value={analyticsData.aiGeneratedCount}
          change={`${((analyticsData.aiGeneratedCount / analyticsData.totalScenarios) * 100).toFixed(1)}% of total`}
          icon={<TrendingUp className="w-5 h-5" />}
          color={config.charts.colors.secondary}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${analyticsData.averageResponseTime}s`}
          change="-0.3s from yesterday"
          icon={<Clock className="w-5 h-5" />}
          color={config.charts.colors.accent}
        />
        <MetricCard
          title="Success Rate"
          value={`${analyticsData.successRate}%`}
          change="+0.5% from last week"
          icon={<Activity className="w-5 h-5" />}
          color={config.charts.colors.secondary}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Breakdown */}
        <div className="bg-white rounded-lg border p-6">
          <SimpleBarChart
            data={industryChartData}
            title="Scenarios by Industry"
            color={config.charts.colors.primary}
            type="bar"
          />
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <SimplePieChart
            data={categoryChartData}
            title="Category Distribution"
            type="pie"
          />
        </div>

        {/* Top Prompts */}
        <div className="bg-white rounded-lg border p-6">
          <SimpleBarChart
            data={topPromptsData}
            title="Most Used Prompts"
            color={config.charts.colors.accent}
            type="bar"
          />
        </div>

        {/* Usage Trend (placeholder) */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Usage Trend (Last 7 Days)</h4>
          <div className="h-48 flex items-end space-x-2">
            {analyticsData.timeSeriesData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-500"
                  style={{ height: `${(item.count / 35) * 100}%` }}
                ></div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(item.date).toLocaleDateString('en', { weekday: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}