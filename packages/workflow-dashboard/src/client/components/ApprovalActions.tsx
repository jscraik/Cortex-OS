/**
 * ApprovalActions Component
 * WCAG 2.2 AA compliant approval interface
 * Part of brAInwav Cortex-OS Unified Workflow Dashboard
 */

import { useState } from 'react';

export interface ApprovalActionsProps {
	gateId: string;
	workflowId: string;
	onApprove?: (rationale: string) => void;
	onReject?: (rationale: string) => void;
}

export function ApprovalActions({
	gateId,
	workflowId,
	onApprove,
	onReject,
}: ApprovalActionsProps): JSX.Element {
	const [rationale, setRationale] = useState('');
	const [announcement, setAnnouncement] = useState('');

	const handleApprove = () => {
		if (!rationale.trim()) {
			setAnnouncement('brAInwav: Please provide rationale for approval');
			return;
		}

		setAnnouncement(`brAInwav: Gate ${gateId} approved`);
		onApprove?.(rationale);
		setRationale(''); // Clear to prevent duplicate submissions
	};

	const handleReject = () => {
		if (!rationale.trim()) {
			setAnnouncement('brAInwav: Please provide rationale for rejection');
			return;
		}

		setAnnouncement(`brAInwav: Gate ${gateId} rejected`);
		onReject?.(rationale);
		setRationale(''); // Clear to prevent duplicate submissions
	};

	return (
		<section
			className="approval-actions"
			style={{
				padding: '1rem',
				border: '1px solid #ccc',
				borderRadius: '4px',
				fontFamily: 'system-ui, sans-serif',
			}}
		>
			<h3 style={{ marginBottom: '1rem' }}>brAInwav Gate Approval: {gateId}</h3>

			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				style={{
					marginBottom: '1rem',
					padding: announcement ? '0.5rem' : '0',
					backgroundColor: announcement ? '#f0f0f0' : 'transparent',
					borderRadius: '4px',
				}}
			>
				{announcement}
			</div>

			<div style={{ marginBottom: '1rem' }}>
				<label
					htmlFor={`rationale-${gateId}`}
					style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
				>
					Rationale (required):
				</label>
				<textarea
					id={`rationale-${gateId}`}
					value={rationale}
					onChange={(e) => setRationale(e.target.value)}
					required
					aria-required="true"
					aria-describedby={`rationale-help-${gateId}`}
					style={{
						width: '100%',
						minHeight: '80px',
						padding: '0.5rem',
						fontSize: '1rem',
						borderRadius: '4px',
						border: '1px solid #ccc',
					}}
				/>
				<div
					id={`rationale-help-${gateId}`}
					style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}
				>
					Provide your reasoning for this decision
				</div>
			</div>

			<div style={{ display: 'flex', gap: '1rem' }}>
				<button
					type="button"
					onClick={handleApprove}
					aria-label={`Approve gate ${gateId}`}
					style={{
						minWidth: '44px',
						minHeight: '44px',
						padding: '0.75rem 1.5rem',
						fontSize: '1rem',
						fontWeight: 'bold',
						backgroundColor: '#28a745',
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						cursor: 'pointer',
					}}
				>
					✓ Approve
				</button>

				<button
					type="button"
					onClick={handleReject}
					aria-label={`Reject gate ${gateId}`}
					style={{
						minWidth: '44px',
						minHeight: '44px',
						padding: '0.75rem 1.5rem',
						fontSize: '1rem',
						fontWeight: 'bold',
						backgroundColor: '#dc3545',
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						cursor: 'pointer',
					}}
				>
					✗ Reject
				</button>
			</div>
		</section>
	);
}
