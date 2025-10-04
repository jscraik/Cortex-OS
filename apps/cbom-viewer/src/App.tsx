import type { CbomDocument } from '@cortex-os/cbom';
import { ContextGraph } from './components/ContextGraph.js';
import { SummaryPanel } from './components/SummaryPanel.js';
import { useCbomFile } from './hooks/useCbomFile.js';

function EmptyState(): JSX.Element {
	return <p aria-live="polite">Select a CBOM file to inspect the captured run evidence.</p>;
}

function ErrorBanner({ message }: { message: string }): JSX.Element {
	return (
		<div role="alert" className="error-banner">
			{message}
		</div>
	);
}

function ViewerLayout({ document }: { document: CbomDocument }): JSX.Element {
	return (
		<div className="viewer-grid">
			<SummaryPanel document={document} />
			<ContextGraph document={document} />
		</div>
	);
}

export function App(): JSX.Element {
	const { document, error, openFile } = useCbomFile();

	return (
		<main className="app-shell">
			<header className="toolbar">
				<h1>Cortex Context BOM Viewer</h1>
				<button type="button" onClick={openFile} className="primary">
					Load CBOM
				</button>
			</header>
			{error ? <ErrorBanner message={error} /> : null}
			{document ? <ViewerLayout document={document} /> : <EmptyState />}
		</main>
	);
}
