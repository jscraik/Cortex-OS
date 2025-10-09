import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BudgetLedger, BudgetManager } from './budget-manager.js';

function createBudgetFile(contents: string): string {
	const dir = mkdtempSync(join(tmpdir(), 'budget-test-'));
	const file = join(dir, '.budget.yml');
	writeFileSync(file, contents, 'utf8');
	return file;
}

describe('BudgetManager', () => {
	it('loads budget profiles and evaluates usage', () => {
		const budgetFile = createBudgetFile(`
budgets:
  quick:
    max_total_req: 5
    max_total_duration_ms: 1000
`);
		const manager = new BudgetManager({ budgetFilePath: budgetFile, clock: () => 0 });
		const profile = manager.getProfile('quick');
		expect(profile.maxTotalReq).toBe(5);
		const current = manager.createEmptyUsage();
		const evaluation = manager.evaluate({
			profileName: 'quick',
			currentUsage: current,
			requestUnits: 1,
			requestDurationMs: 100,
		});

		expect(evaluation.withinLimits).toBe(true);
		expect(evaluation.projectedUsage.totalReq).toBe(1);
		expect(evaluation.projectedUsage.totalDurationMs).toBe(100);
	});
});

describe('BudgetLedger', () => {
	it('tracks usage per tenant and enforces limits', () => {
		const budgetFile = createBudgetFile(`
budgets:
  load:
    max_total_req: 10
    max_total_duration_ms: 500
`);
		const manager = new BudgetManager({ budgetFilePath: budgetFile, clock: () => Date.now() });
		const ledger = new BudgetLedger(manager, () => Date.now());

		const first = ledger.record({
			profileName: 'load',
			tenantKey: 'tenant-a',
			requestDurationMs: 100,
		});
		expect(first.withinLimits).toBe(true);

		const second = ledger.record({
			profileName: 'load',
			tenantKey: 'tenant-a',
			requestDurationMs: 400,
		});
		expect(second.withinLimits).toBe(true);

		const third = ledger.record({
			profileName: 'load',
			tenantKey: 'tenant-a',
			requestDurationMs: 100,
		});
		expect(third.withinLimits).toBe(false);
		expect(third.reason).toBe('max_total_duration_exceeded');
	});
});
