import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, Server, Database } from 'lucide-react';
import monitor from './monitoring';

/**
 * Monitoring Dashboard Component
 * Displays real-time metrics and system health
 */
export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [serverMetrics, setServerMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get client-side metrics
    const clientMetrics = monitor.getMetrics();
    setMetrics(clientMetrics);

    // Fetch server metrics
    fetchServerMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      const updated = monitor.getMetrics();
      setMetrics(updated);
      fetchServerMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchServerMetrics = async () => {
    try {
      const response = await fetch('/api/monitoring/metrics');
      const data = await response.json();
      setServerMetrics(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch server metrics:', error);
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="text-blue-600" size={28} />
        <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
      </div>

      {/* Client Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Page Views"
          value={metrics?.pageViews || 0}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="API Calls"
          value={metrics?.apiCalls || 0}
          icon={Server}
          color="green"
        />
        <MetricCard
          title="Errors"
          value={metrics?.errors || 0}
          icon={AlertCircle}
          color={metrics?.errors > 0 ? 'red' : 'gray'}
        />
        <MetricCard
          title="Avg Response"
          value={`${metrics?.avgResponseTime || 0}ms`}
          icon={Clock}
          color="purple"
        />
      </div>

      {/* Server Metrics */}
      {serverMetrics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Server size={20} />
            Backend Server Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Uptime</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatUptime(serverMetrics.server.uptime)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Memory Usage</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatMemory(serverMetrics.server.memory.heapUsed)}
              </div>
              <div className="text-xs text-gray-500">
                / {formatMemory(serverMetrics.server.memory.heapTotal)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Cache Size</div>
              <div className="text-2xl font-bold text-gray-900">
                {serverMetrics.cache.size}
              </div>
              <div className="text-xs text-gray-500">entries</div>
            </div>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="text-green-600" size={24} />
        <div>
          <div className="font-semibold text-green-900">All Systems Operational</div>
          <div className="text-sm text-green-700">
            Error Rate: {metrics?.errorRate || 0}%
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    gray: 'bg-gray-50 border-gray-200 text-gray-600'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium opacity-80">{title}</div>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
