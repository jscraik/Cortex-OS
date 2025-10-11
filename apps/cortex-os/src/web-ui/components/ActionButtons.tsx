import React, { useState } from 'react';
import type { AgentStatus } from '../types';

interface ActionButtonsProps {
  status: AgentStatus;
  onAction: (action: 'pause' | 'resume' | 'retry') => void;
  size?: 'sm' | 'md';
}

export function ActionButtons({ status, onAction, size = 'md' }: ActionButtonsProps) {
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  const handleAction = (action: 'pause' | 'resume' | 'retry') => {
    // Show confirmation for write actions
    if (action === 'pause' || action === 'resume' || action === 'retry') {
      setShowConfirm(action);
    }
  };

  const confirmAction = (action: 'pause' | 'resume' | 'retry') => {
    onAction(action);
    setShowConfirm(null);
  };

  const getActionButton = (action: 'pause' | 'resume' | 'retry', label: string, disabled = false) => {
    if (showConfirm === action) {
      return (
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Confirm?</span>
          <button
            onClick={() => confirmAction(action)}
            className={`${sizeClasses[size]} bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500`}
            aria-label={`Confirm ${label}`}
          >
            ✓
          </button>
          <button
            onClick={() => setShowConfirm(null)}
            className={`${sizeClasses[size]} bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500`}
            aria-label={`Cancel ${label}`}
          >
            ✕
          </button>
        </div>
      );
    }

    const baseClasses = `${sizeClasses[size]} rounded focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
    }`;

    const actionStyles = {
      pause: {
        background: 'bg-yellow-600 hover:bg-yellow-700',
        ring: 'focus:ring-yellow-500',
        disabled: status !== 'healthy'
      },
      resume: {
        background: 'bg-green-600 hover:bg-green-700',
        ring: 'focus:ring-green-500',
        disabled: status !== 'degraded' && status !== 'down'
      },
      retry: {
        background: 'bg-blue-600 hover:bg-blue-700',
        ring: 'focus:ring-blue-500',
        disabled: status === 'healthy'
      }
    };

    const style = actionStyles[action];

    return (
      <button
        onClick={() => handleAction(action)}
        disabled={disabled || style.disabled}
        className={`${baseClasses} ${style.background} ${style.ring} text-white`}
        aria-label={label}
        title={style.disabled ? `${label} not available for ${status} agent` : label}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center space-x-2">
      {status === 'healthy' && getActionButton('pause', 'Pause')}
      {(status === 'degraded' || status === 'down') && getActionButton('resume', 'Resume')}
      {(status === 'degraded' || status === 'down') && getActionButton('retry', 'Retry')}
    </div>
  );
}