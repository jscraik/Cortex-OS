import type { CbomDocument } from '@cortex-os/cbom';
import { useId } from 'react';

interface SummaryPanelProps {
	document: CbomDocument;
}

export function SummaryPanel({ document }: SummaryPanelProps): JSX.Element {
	const headingId = useId();
	const policiesPassed = document.policies.filter((policy) => policy.status === 'pass').length;
	const policiesFailed = document.policies.filter((policy) => policy.status === 'fail').length;
	return (
		<section aria-labelledby={headingId} className="summary-panel">
			<h2 id={headingId}>Run summary</h2>
			<dl>
				<div>
					<dt>Run ID</dt>
					<dd>{document.run.id}</dd>
				</div>
				<div>
					<dt>Decisions</dt>
					<dd>{document.decisions.length}</dd>
				</div>
				<div>
					<dt>Policies</dt>
					<dd>
						{policiesPassed} pass / {policiesFailed} fail
					</dd>
				</div>
			</dl>
		</section>
	);
}
