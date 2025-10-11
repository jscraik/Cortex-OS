import React from 'react';
import { StatusIndicator } from './StatusIndicator';
import { ActionButtons } from './ActionButtons';
import type { Agent } from '../types';

interface AgentCardProps {
  agent: Agent;
  onAction: (action: 'pause' | 'resume' | 'retry') => void;
}

export function AgentCard({ agent, onAction }: AgentCardProps) {
  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'down':
        return '⛔';
      default:
        return '❓';
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-lg" role="img" aria-label={`Status: ${agent.status}`}>
            {getStatusIcon(agent.status)}
          </span>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {agent.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {agent.description}
            </p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Type: {agent.type}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last seen: {new Date(agent.lastSeen).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <StatusIndicator
            status={agent.status}
            showIcon={false}
            showLabel={true}
          />

          <ActionButtons
            status={agent.status}
            onAction={onAction}
            size="sm"
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="mt-3 grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Requests</div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {agent.metrics.requests.toLocaleString()}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Success Rate</div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {agent.metrics.successRate}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg Latency</div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {agent.metrics.avgLatency}ms
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Errors</div>
          <div className="text-sm font-medium text-red-600 dark:text-red-400">
            {agent.metrics.errors}
          </div>
        </div>
      </div>

      {/* Tags */}
      {agent.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {agent.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}