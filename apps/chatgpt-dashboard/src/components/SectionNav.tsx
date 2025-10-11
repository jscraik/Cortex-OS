import * as React from 'react';

import { useScrollSpy } from '../hooks/useScrollSpy';
import {
	LogsSection,
	TracesSection,
	MetricsSection,
	AgentsSection,
	WorkflowsSection,
	ConnectorsSection,
} from '../sections/lazySections';

const SECTION_IDS = ['home', 'health', 'logs', 'traces', 'metrics', 'agents', 'workflows', 'connectors'] as const;

const PRELOADERS: Partial<Record<typeof SECTION_IDS[number], () => Promise<unknown>>> = {
	logs: LogsSection.preload,
	traces: TracesSection.preload,
	metrics: MetricsSection.preload,
	agents: AgentsSection.preload,
	workflows: WorkflowsSection.preload,
	connectors: ConnectorsSection.preload,
};

const LABELS: Record<typeof SECTION_IDS[number], string> = {
	home: 'Home',
	health: 'Health',
	logs: 'Logs',
	traces: 'Traces',
	metrics: 'Metrics',
	agents: 'Agents',
	workflows: 'Workflows',
	connectors: 'Connectors',
};

const ICONS: Record<typeof SECTION_IDS[number], string> = {
	home: 'fa-solid fa-house',
	health: 'fa-solid fa-heart-pulse text-status-green',
	logs: 'fa-solid fa-file-lines',
	traces: 'fa-solid fa-sitemap',
	metrics: 'fa-solid fa-chart-line',
	agents: 'fa-solid fa-robot text-brand-accent',
	workflows: 'fa-solid fa-diagram-project text-purple-500',
	connectors: 'fa-solid fa-plug text-emerald-500',
};

export function SectionNav(): React.ReactElement {
	const active = useScrollSpy(SECTION_IDS as unknown as string[]);

	const handleClick = React.useCallback((id: typeof SECTION_IDS[number]) => {
		PRELOADERS[id]?.();
		const element = document.getElementById(id);
		if (!element) {
			return;
		}

		const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
		element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
		element.focus({ preventScroll: true });
		history.pushState({}, '', `#${id}`);
	}, []);

	const baseButtonClasses =
		'w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent';
	const inactiveClasses = 'text-neutral-600 hover:bg-neutral-100';
	const activeClasses = 'bg-brand-accent text-white shadow-sm';

	return (
		<aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-neutral-200 z-30 hidden lg:flex lg:flex-col">
			<div className="flex items-center gap-3 px-6 h-16 border-b border-neutral-200">
				<div className="w-9 h-9 bg-gradient-to-br from-brand-accent to-purple-600 rounded-lg grid place-items-center text-white">
					<i className="fa-solid fa-brain" />
				</div>
				<div>
					<p className="font-bold text-lg text-neutral-800">brAInwav</p>
					<p className="text-neutral-500 text-xs -mt-0.5">Cortex-OS</p>
				</div>
			</div>
			<nav className="p-4 space-y-1 overflow-y-auto" aria-label="Section navigation">
				{SECTION_IDS.map((id) => {
					const current = active === id;
					return (
						<button
							key={id}
							type="button"
							onClick={() => handleClick(id)}
							className={`${baseButtonClasses} ${current ? activeClasses : inactiveClasses}`}
							aria-current={current ? 'page' : undefined}
						>
							<i className={`${ICONS[id]} w-5 h-5 text-base`} aria-hidden="true" />
							<span className="font-medium">{LABELS[id]}</span>
						</button>
					);
				})}
			</nav>
		</aside>
	);
}
