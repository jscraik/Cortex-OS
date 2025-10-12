import { preloadableLazy } from '../utils/preloadableLazy.js';

export const LogsSection = preloadableLazy(() => import('./LogsSection.js'));
export const TracesSection = preloadableLazy(() => import('./TracesSection.js'));
export const MetricsSection = preloadableLazy(() => import('./MetricsSection.js'));
export const AgentsSection = preloadableLazy(() => import('./AgentsSection.js'));
export const WorkflowsSection = preloadableLazy(() => import('./WorkflowsSection.js'));
export const ConnectorsSection = preloadableLazy(() => import('./ConnectorsSection.js'));
