import type { CbomDocument } from '@cortex-os/cbom';
import { useId } from 'react';

interface ContextGraphProps {
	document: CbomDocument;
}

export function ContextGraph({ document }: ContextGraphProps): JSX.Element {
	const headingId = useId();
	return (
		<section aria-labelledby={headingId} className="context-graph">
			<h2 id={headingId}>Context flow</h2>
			<ul>
				{document.context.tools.map((tool) => (
					<li key={tool.id}>
						<strong>{tool.name}</strong>
						<span> ({tool.evidenceIds?.join(', ') ?? 'no evidence'})</span>
					</li>
				))}
			</ul>
		</section>
	);
}
