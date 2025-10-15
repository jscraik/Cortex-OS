/**
 * Prompts Registry Module
 *
 * MCP 2025-06-18 Prompts implementation using FastMCP's
 * built-in prompt support with structured content output.
 */

import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { BRAND, createBrandedLog } from '../utils/brand.js';
import { loadServerConfig } from '../utils/config.js';
import { renderCodeChangePlan } from './code-change-plan.js';
import { renderIncidentRetro } from './incident-retro.js';
import { renderMemoryAnalysis } from './memory-analysis.js';

/**
 * Code Change Plan prompt arguments
 */
export const CodeChangePlanArgs = z.object({
	goal: z.string().min(1, 'Goal is required'),
	constraints: z.array(z.string()).default([]),
	acceptance_criteria: z.array(z.string()).default([]),
});

/**
 * Memory Analysis prompt arguments
 */
export const MemoryAnalysisArgs = z.object({
	query: z.string().min(1, 'Query is required'),
	timeframe: z.string().optional().describe('Timeframe for analysis (e.g., "last 7 days")'),
	focus_areas: z.array(z.string()).optional().describe('Specific areas to focus on'),
});

/**
 * Incident Retro prompt arguments
 */
export const IncidentRetroArgs = z.object({
	incident_id: z.string().optional().describe('Incident identifier'),
	timeline: z.string().optional().describe('Timeline of events'),
	severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
	affected_systems: z.array(z.string()).optional().describe('Systems affected by incident'),
});

/**
 * Register all prompts with the server
 */
export function createPrompts(server: any, logger: any) {
	const config = loadServerConfig();

	if (!config.promptsEnabled) {
		logger.info(createBrandedLog('prompts_disabled'), 'MCP prompts disabled');
		return;
	}

	const prompts = server.prompts;

	if (!prompts || typeof prompts.add !== 'function') {
		logger.warn(
			createBrandedLog('prompts_unsupported'),
			'FastMCP server does not expose a prompts registry; skipping prompt registration',
		);
		return;
	}

	// Code Change Plan Prompt
	prompts.add({
		name: 'code-change-plan',
		description: 'Generate structured code change plans with constraints and acceptance criteria',
		inputSchema: CodeChangePlanArgs,
		handler: async (args: any) => {
			logger.info(
				createBrandedLog('prompt_rendering', { prompt: 'code-change-plan' }),
				'Rendering code change plan prompt',
			);
			return renderCodeChangePlan(args);
		},
	});

		// Memory Analysis Prompt
	prompts.add({
		name: 'memory-analysis',
		description: 'Analyze memories with AI-powered insights and summarization',
		inputSchema: MemoryAnalysisArgs,
		handler: async (args: any) => {
			logger.info(
				createBrandedLog('prompt_rendering', { prompt: 'memory-analysis' }),
				'Rendering memory analysis prompt',
			);
			return renderMemoryAnalysis(args);
		},
	});

	// Incident Retrospective Prompt
	prompts.add({
		name: 'incident-retro',
		description: 'Generate structured incident retrospective prompts',
		inputSchema: IncidentRetroArgs,
		handler: async (args: any) => {
			logger.info(
				createBrandedLog('prompt_rendering', { prompt: 'incident-retro' }),
				'Rendering incident retrospective prompt',
			);
			return renderIncidentRetro(args);
		},
	});

	logger.info(
		createBrandedLog('prompts_registered', { count: 3 }),
		`${BRAND.prefix} prompts registered`,
	);
}
