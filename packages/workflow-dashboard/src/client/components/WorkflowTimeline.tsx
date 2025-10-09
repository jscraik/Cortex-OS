/**
 * WorkflowTimeline Component
 * WCAG 2.2 AA compliant timeline visualization
 * Part of brAInwav Cortex-OS Unified Workflow Dashboard
 */

interface Gate {
	id: string;
	status: 'pending' | 'in-progress' | 'completed' | 'failed';
	startedAt?: string;
	completedAt?: string;
}

interface Phase {
	id: number;
	status: 'pending' | 'in-progress' | 'completed' | 'failed';
	startedAt?: string;
	completedAt?: string;
}

export interface WorkflowTimelineProps {
	workflow: {
		id: string;
		featureName: string;
		status: string;
		currentStep: string;
		gates: Gate[];
		phases: Phase[];
	};
}

export function WorkflowTimeline({ workflow }: WorkflowTimelineProps): JSX.Element {
	return (
		<section
			aria-label="Workflow Timeline"
			className="workflow-timeline"
			style={{
				padding: '1rem',
				fontFamily: 'system-ui, sans-serif',
			}}
		>
			<h2 style={{ marginBottom: '1rem' }}>brAInwav Workflow: {workflow.featureName}</h2>

			<div aria-live="polite" aria-atomic="true" style={{ marginBottom: '1rem' }}>
				Current Status: {workflow.status} at {workflow.currentStep}
			</div>

			<div className="timeline-gates" role="list" aria-label="Quality Gates">
				{workflow.gates.map((gate) => (
					<div
						key={gate.id}
						role="listitem"
						data-status={gate.status}
						style={{
							padding: '0.75rem',
							marginBottom: '0.5rem',
							border: '1px solid #ccc',
							borderRadius: '4px',
							backgroundColor: getStatusColor(gate.status),
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
							<span
								role="img"
								aria-label={`Gate ${gate.id} status: ${gate.status}`}
								style={{ fontSize: '1.5rem' }}
							>
								{getStatusIcon(gate.status)}
							</span>
							<strong>{gate.id}</strong>
							<span> - {gate.status}</span>
						</div>
					</div>
				))}
			</div>

			<div className="timeline-phases" role="list" aria-label="Development Phases">
				{workflow.phases.map((phase) => (
					<div
						key={phase.id}
						role="listitem"
						data-status={phase.status}
						style={{
							padding: '0.75rem',
							marginBottom: '0.5rem',
							border: '1px solid #ccc',
							borderRadius: '4px',
							backgroundColor: getStatusColor(phase.status),
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
							<span
								role="img"
								aria-label={`Phase ${phase.id} status: ${phase.status}`}
								style={{ fontSize: '1.5rem' }}
							>
								{getStatusIcon(phase.status)}
							</span>
							<strong>Phase {phase.id}</strong>
							<span> - {phase.status}</span>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function getStatusIcon(status: string): string {
	const icons: Record<string, string> = {
		pending: '⏳',
		'in-progress': '🔄',
		completed: '✅',
		failed: '❌',
	};
	return icons[status] || '❓';
}

function getStatusColor(status: string): string {
	const colors: Record<string, string> = {
		pending: '#f5f5f5',
		'in-progress': '#fff3cd',
		completed: '#d1e7dd',
		failed: '#f8d7da',
	};
	return colors[status] || '#ffffff';
}
