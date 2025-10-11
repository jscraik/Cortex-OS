import React from 'react';
import type { SystemHealth } from '../types';

interface HealthMetricsProps {
  health: SystemHealth;
}

export function HealthMetrics({ health }: HealthMetricsProps) {
  const MetricCard = ({
    title,
    value,
    unit,
    trend,
    color = 'blue'
  }: {
    title: string;
    value: number;
    unit: string;
    trend?: 'up' | 'down' | 'stable';
    color?: string;
  }) => {
    const colorClasses = {
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-green-600 dark:text-green-400',
      yellow: 'text-yellow-600 dark:text-yellow-400',
      red: 'text-red-600 dark:text-red-400'
    };

    const bgColorClasses = {
      blue: 'bg-blue-50 dark:bg-blue-900/20',
      green: 'bg-green-50 dark:bg-green-900/20',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20',
      red: 'bg-red-50 dark:bg-red-900/20'
    };

    const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
      switch (trend) {
        case 'up':
          return '↗️';
        case 'down':
          return '↘️';
        default:
          return '➡️';
      }
    };

    return (
      <div className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${bgColorClasses[color as keyof typeof bgColorClasses]}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </span>
          {trend && (
            <span className="text-xs" role="img" aria-label={`Trend: ${trend}`}>
              {getTrendIcon(trend)}
            </span>
          )}
        </div>
        <div className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses]}`}>
          {value}{unit}
        </div>

        {/* Gentle, low-contrast sparkline */}
        <div className="mt-2 h-8 flex items-end space-x-0.5">
          {Array.from({ length: 20 }).map((_, i) => {
            const height = Math.random() * 100 * 0.3 + 10; // Low opacity, subtle variation
            return (
              <div
                key={i}
                className="w-0.5 bg-current opacity-20"
                style={{ height: `${height}%` }}
                aria-hidden="true"
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Active Agents */}
          <MetricCard
            title="Active Agents"
            value={health.agents.active}
            unit={`/${health.agents.total}`}
            trend="stable"
            color="green"
          />

          {/* Workflows */}
          <MetricCard
            title="Running Workflows"
            value={health.workflows.active}
            unit={`/${health.workflows.total}`}
            trend="up"
            color="blue"
          />

          {/* System Load */}
          <MetricCard
            title="CPU Usage"
            value={health.metrics.cpu}
            unit="%"
            trend={health.metrics.cpu > 80 ? 'up' : 'stable'}
            color={health.metrics.cpu > 80 ? 'red' : health.metrics.cpu > 60 ? 'yellow' : 'green'}
          />

          {/* Memory Usage */}
          <MetricCard
            title="Memory"
            value={health.metrics.memory}
            unit="%"
            trend={health.metrics.memory > 80 ? 'up' : 'stable'}
            color={health.metrics.memory > 80 ? 'red' : health.metrics.memory > 60 ? 'yellow' : 'green'}
          />
        </div>

        {/* System Status Summary */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              System Status:
            </span>
            <span className={`text-sm font-medium ${
              health.overall === 'healthy' ? 'text-green-600 dark:text-green-400' :
              health.overall === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {health.overall.charAt(0).toUpperCase() + health.overall.slice(1)}
            </span>
          </div>

          {/* Quick stats */}
          <div className="flex items-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
            <span>{health.agents.degraded} degraded</span>
            <span>{health.agents.down} down</span>
            <span>Network: {health.metrics.network}%</span>
            <span>Storage: {health.metrics.storage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}