import { preloadableLazy } from '../utils/preloadableLazy';

export const LogsSection = preloadableLazy(() => import('./LogsSection'));
export const TracesSection = preloadableLazy(() => import('./TracesSection'));
export const MetricsSection = preloadableLazy(() => import('./MetricsSection'));
export const AgentsSection = preloadableLazy(() => import('./AgentsSection'));
export const WorkflowsSection = preloadableLazy(() => import('./WorkflowsSection'));
export const ConnectorsSection = preloadableLazy(() => import('./ConnectorsSection'));
