import React from 'react';
import type { AgentStatus } from '../types';

interface StatusIndicatorProps {
  status: AgentStatus;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({
  status,
  showIcon = true,
  showLabel = true,
  size = 'md'
}: StatusIndicatorProps) {
  const getStatusConfig = (status: AgentStatus) => {
    switch (status) {
      case 'healthy':
        return {
          icon: '✅',
          label: 'OK',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900',
          dotColor: 'bg-green-500'
        };
      case 'degraded':
        return {
          icon: '⚠️',
          label: 'Degraded',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900',
          dotColor: 'bg-yellow-500'
        };
      case 'down':
        return {
          icon: '⛔',
          label: 'Down',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900',
          dotColor: 'bg-red-500'
        };
      default:
        return {
          icon: '❓',
          label: 'Unknown',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Status dot (non-color visual cue) */}
      <span
        className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${config.dotColor}`}
        aria-hidden="true"
      />

      {/* Icon if enabled */}
      {showIcon && (
        <span className={sizeClasses[size]} role="img" aria-label={`Status: ${config.label}`}>
          {config.icon}
        </span>
      )}

      {/* Label if enabled */}
      {showLabel && (
        <span className={`font-medium ${config.color} ${sizeClasses[size]}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}