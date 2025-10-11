import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AgentCard,
  HealthMetrics,
  StatusIndicator,
  LogViewer,
  ActionButtons,
  SearchBar,
  HelpOverlay
} from './components';
import { useChatGPTState, useChatGPTMeta } from './hooks/useChatGPT';
import { DashboardProvider } from './contexts/DashboardContext';
import { useSSE } from './hooks/useSSE';
import type { DashboardState, Agent, LogEntry, SystemHealth } from './types';

// Add ChatGPT metadata for widget description and preferences
const meta = {
  "openai/widgetDescription": "Cortex-OS Dashboard for monitoring agents, workflows, and system health with real-time updates and ChatGPT-native integration",
  "openai/widgetPrefersBorder": true,
  "openai/widgetAccessible": true,
  "openai/widgetCSP": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:;",
  "openai/locale": "en-US"
};

function DashboardApp() {
  const [state, setState] = useState<DashboardState>({
    searchQuery: '',
    selectedTags: [],
    activePanel: 'agents',
    filters: {
      status: 'all',
      environment: 'all'
    }
  });

  const { setWidgetState } = useChatGPTState();
  const { setMeta } = useChatGPTMeta();

  // Set metadata on mount
  useEffect(() => {
    Object.entries(meta).forEach(([key, value]) => {
      setMeta(key, value);
    });
  }, [setMeta]);

  // Persist state to ChatGPT
  useEffect(() => {
    setWidgetState({
      searchQuery: state.searchQuery,
      selectedTags: state.selectedTags,
      activePanel: state.activePanel
    });
  }, [state.searchQuery, state.selectedTags, state.activePanel, setWidgetState]);

  // SSE connection for real-time updates
  const { data: sseData, isConnected } = useSSE('/v1/events?stream=sse');

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      if ((e.key === '?' || (e.ctrlKey && e.key === '/'))) {
        e.preventDefault();
        setState(prev => ({ ...prev, showHelp: !prev.showHelp }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const handleFilterChange = useCallback((filters: Partial<DashboardState['filters']>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters }
    }));
  }, []);

  const handleAgentAction = useCallback(async (agentId: string, action: 'pause' | 'resume' | 'retry') => {
    // Add tool invocation metadata
    setMeta(`openai/toolInvocation/invoking`, `Agent ${action} for ${agentId}`);

    try {
      const response = await fetch(`/v1/agents/${agentId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        setMeta(`openai/toolInvocation/invoked`, result.message || `Successfully ${action}ed agent ${agentId}`);
      }
    } catch (error) {
      setMeta(`openai/toolInvocation/invoked`, `Failed to ${action} agent ${agentId}: ${error}`);
    }
  }, [setMeta]);

  const filteredAgents = useMemo(() => {
    // Filter logic based on search query, tags, and status
    return []; // Implementation would filter agents
  }, [state.searchQuery, state.selectedTags, state.filters]);

  const systemHealth: SystemHealth = useMemo(() => ({
    overall: 'healthy',
    agents: { total: 12, active: 8, degraded: 3, down: 1 },
    workflows: { total: 5, active: 3, completed: 2 },
    metrics: {
      cpu: 45,
      memory: 62,
      network: 23,
      storage: 78
    }
  }), []);

  if (state.showHelp) {
    return <HelpOverlay onClose={() => setState(prev => ({ ...prev, showHelp: false }))} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Cortex-OS Dashboard
              </h1>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Environment: Production
                </span>
                {isConnected ? (
                  <span className="flex items-center text-xs text-green-600 dark:text-green-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    Live
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                    Offline
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <SearchBar
                value={state.searchQuery}
                onChange={handleSearch}
                placeholder="Search agents, workflows, logs..."
              />

              <button
                onClick={() => window.openai?.requestDisplayMode?.({ mode: "fullscreen" })}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Open fullscreen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>

              <button
                onClick={() => setState(prev => ({ ...prev, showHelp: true }))}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Help (Press ?)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Health Metrics Strip */}
      <HealthMetrics health={systemHealth} />

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Agents</h2>
                  <div className="flex items-center space-x-2">
                    <select
                      value={state.filters.status}
                      onChange={(e) => handleFilterChange({ status: e.target.value })}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="degraded">Degraded</option>
                      <option value="down">Down</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onAction={(action) => handleAgentAction(agent.id, action)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Logs Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">System Logs</h2>
              </div>
              <LogViewer logs={[]} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Initialize the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <DashboardProvider>
      <DashboardApp />
    </DashboardProvider>
  );
}

export default DashboardApp;