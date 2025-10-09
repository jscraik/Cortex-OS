/**
 * @file packages/workflow-orchestrator/src/cli/commands/init.ts
 * @description Initialize new workflow with PRP blueprint and task constitution
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import { execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import ora from 'ora';
import { displayBanner, formatError, formatSuccess } from '../banner.js';

/**
 * Convert feature name to kebab-case task ID
 */
export function toTaskId(featureName: string): string {
	return featureName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Generate PRP blueprint content
 */
export function generateBlueprint(featureName: string, priority: string): string {
	return `# PRP Blueprint: ${featureName}

**Task ID**: \`${toTaskId(featureName)}\`  
**Priority**: ${priority}  
**Created**: ${new Date().toISOString().split('T')[0]}  
**brAInwav Production Standards**: Required

---

## G0: Ideation Gate

### Feature Description
${featureName}

### Business Value
<!-- Describe the business value and user impact -->

### Success Criteria
<!-- Define measurable success criteria -->

---

## Architecture Considerations (G1)

### Technical Approach
<!-- High-level technical approach -->

### Dependencies
<!-- List technical dependencies -->

### Risks
<!-- Identify technical risks -->

---

**Maintained by**: brAInwav Development Team  
**Co-authored-by**: brAInwav Development Team
`;
}

/**
 * Generate task constitution content
 */
export function generateConstitution(featureName: string, taskId: string): string {
	return `# Task Constitution: ${featureName}

**Task ID**: \`${taskId}\`  
**Created**: ${new Date().toISOString().split('T')[0]}  
**brAInwav Standards**: Enforced

---

## Phase 0: Constitution (Research Direction)

This document establishes the research direction and principles for implementing ${featureName}.

### Research Questions
1. What existing patterns can we leverage?
2. What are the key technical challenges?
3. What security considerations apply?

### Architectural Principles
- Follow brAInwav coding standards (functions ≤40 lines, named exports only)
- Maintain 95%+ test coverage
- Ensure WCAG 2.2 AA accessibility compliance
- Apply zero-tolerance security policy

### Quality Gates
All PRP gates (G0-G7) must pass before deployment.

---

**Maintained by**: brAInwav Development Team  
**Co-authored-by**: brAInwav Development Team
`;
}

/**
 * Initialize new workflow
 */
export async function initWorkflow(featureName: string, priority: string): Promise<void> {
	displayBanner();

	const taskId = toTaskId(featureName);
	const taskDir = join(process.cwd(), 'tasks', taskId);

	const spinner = ora('Initializing workflow...').start();

	try {
		// Create task directory
		await mkdir(taskDir, { recursive: true });
		spinner.text = 'Created task directory';

		// Generate PRP blueprint
		const blueprintPath = join(taskDir, 'prp-blueprint.md');
		await writeFile(blueprintPath, generateBlueprint(featureName, priority));
		console.log(formatSuccess(`Created: tasks/${taskId}/prp-blueprint.md`));

		// Generate constitution
		const constitutionPath = join(taskDir, 'constitution.md');
		await writeFile(constitutionPath, generateConstitution(featureName, taskId));
		console.log(formatSuccess(`Created: tasks/${taskId}/constitution.md`));

		// Create git branch
		try {
			execSync(`git checkout -b feat/${taskId}`, { stdio: 'ignore' });
			console.log(formatSuccess(`Created branch: feat/${taskId}`));
		} catch {
			console.log(formatError('Failed to create git branch (may already exist)'));
		}

		spinner.succeed('Workflow initialized successfully');

		console.log('');
		console.log(formatSuccess(`Next steps:`));
		console.log(`  1. Review and update tasks/${taskId}/prp-blueprint.md`);
		console.log(`  2. Run: cortex-workflow run ${taskId}`);
		console.log('');
	} catch (error) {
		spinner.fail('Initialization failed');
		throw error;
	}
}
