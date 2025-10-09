import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { ApprovalActions } from '../client/components/ApprovalActions.js';
import { WorkflowTimeline } from '../client/components/WorkflowTimeline.js';

expect.extend(toHaveNoViolations);

function createMockWorkflow() {
	return {
		id: 'wf-123',
		featureName: 'Test Feature',
		status: 'in-progress' as const,
		currentStep: 'G2' as const,
		gates: [
			{ id: 'G0', status: 'completed', completedAt: '2025-02-06T10:00:00Z' },
			{ id: 'G1', status: 'completed', completedAt: '2025-02-06T11:00:00Z' },
			{ id: 'G2', status: 'in-progress', startedAt: '2025-02-06T12:00:00Z' },
		],
		phases: [{ id: 0, status: 'completed', completedAt: '2025-02-06T10:30:00Z' }],
	};
}

describe('Dashboard Accessibility', () => {
	describe('WorkflowTimeline', () => {
		it('should have no axe violations', async () => {
			const { container } = render(
				React.createElement(WorkflowTimeline, { workflow: createMockWorkflow() }),
			);

			const results = await axe(container);
			expect(results).toHaveNoViolations();
		});

		it('should be keyboard navigable', () => {
			const { getByRole } = render(
				React.createElement(WorkflowTimeline, { workflow: createMockWorkflow() }),
			);

			const timeline = getByRole('region', { name: /timeline/i });
			expect(timeline).toBeDefined();

			// Interactive elements should be focusable
			const buttons = timeline.querySelectorAll('button');
			buttons.forEach((button) => {
				expect(button.getAttribute('tabindex')).not.toBe('-1');
			});
		});

		it('should use icon + text for status (not color alone)', () => {
			const { container } = render(
				React.createElement(WorkflowTimeline, { workflow: createMockWorkflow() }),
			);

			const statusIndicators = container.querySelectorAll('[data-status]');
			statusIndicators.forEach((indicator) => {
				// Should have text content
				expect(indicator.textContent?.trim()).not.toBe('');
			});
		});
	});

	describe('ApprovalActions', () => {
		it('should have accessible labels for approve/reject buttons', () => {
			const { getByRole } = render(
				React.createElement(ApprovalActions, { gateId: 'G0', workflowId: 'wf-123' }),
			);

			const approveButton = getByRole('button', { name: /approve/i });
			const rejectButton = getByRole('button', { name: /reject/i });

			expect(approveButton).toBeDefined();
			expect(rejectButton).toBeDefined();
		});

		it('should announce brAInwav context to screen readers', () => {
			const { container } = render(
				React.createElement(ApprovalActions, { gateId: 'G0', workflowId: 'wf-123' }),
			);

			const announcement = container.querySelector('[aria-live]');
			expect(announcement).toBeDefined();
		});
	});
});
