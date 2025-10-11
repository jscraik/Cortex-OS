import * as React from 'react';

import { SectionNav } from '../components/SectionNav';
import { Header } from '../components/Header';
import { StickyFilterBar } from '../components/StickyFilterBar';
import { LazyOnView } from '../components/LazyOnView';
import HomeSection from '../sections/HomeSection';
import HealthSection from '../sections/HealthSection';
import {
	LogsSection,
	TracesSection,
	MetricsSection,
	AgentsSection,
	WorkflowsSection,
	ConnectorsSection,
} from '../sections/lazySections';

export default function Dashboard(): React.ReactElement {
	return (
		<div className="flex h-screen">
			<SectionNav />
			<div className="flex-1 flex flex-col ml-64 bg-neutral-50">
				<Header />
				<StickyFilterBar />
				<main id="main" className="flex-1 p-8 overflow-y-auto" aria-label="Cortex-OS dashboard main content">
					<section id="home" aria-labelledby="home-heading">
						<h1 id="home-heading" className="sr-only">
							System overview
						</h1>
						<HomeSection />
					</section>
					<section id="health" className="mt-12" aria-labelledby="health-heading">
						<h2 id="health-heading" className="sr-only">
							Health
						</h2>
						<HealthSection />
					</section>

					<div className="mt-12 space-y-8">
					<LazyOnView
						id="logs"
						title="Logs"
						LazyComp={LogsSection}
						componentProps={{}}
						skeleton={<div className="h-48 w-full rounded-xl bg-neutral-200 animate-pulse" />}
					/>
					<LazyOnView
						id="traces"
						title="Traces"
						LazyComp={TracesSection}
						componentProps={{}}
						skeleton={<div className="h-48 w-full rounded-xl bg-neutral-200 animate-pulse" />}
					/>
					<LazyOnView
						id="metrics"
						title="Metrics"
						LazyComp={MetricsSection}
						componentProps={{}}
						skeleton={<div className="h-48 w-full rounded-xl bg-neutral-200 animate-pulse" />}
					/>
					<LazyOnView
						id="agents"
						title="Agents"
						LazyComp={AgentsSection}
						componentProps={{}}
						skeleton={<div className="h-48 w-full rounded-xl bg-neutral-200 animate-pulse" />}
					/>
					<LazyOnView
						id="workflows"
						title="Workflows"
						LazyComp={WorkflowsSection}
						componentProps={{}}
						skeleton={<div className="h-48 w-full rounded-xl bg-neutral-200 animate-pulse" />}
					/>
					<LazyOnView
						id="connectors"
						title="Connectors"
						LazyComp={ConnectorsSection}
						componentProps={{}}
						skeleton={<div className="h-48 w-full rounded-xl bg-neutral-200 animate-pulse" />}
					/>
					</div>

					<footer className="text-center text-xs text-neutral-400 pt-12 pb-8">
						<div className="flex items-center justify-center gap-4 mb-4">
							<span>Keyboard shortcuts:</span>
							<kbd className="kbd">?</kbd>
							<span>for help</span>
							<kbd className="kbd">/</kbd>
							<span>to search</span>
							<kbd className="kbd">⌘R</kbd>
							<span>to refresh</span>
						</div>
						<p>© 2025 brAInwav Cortex-OS. All systems operational.</p>
					</footer>
				</main>
			</div>
		</div>
	);
}
