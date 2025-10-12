/**
 * Cerebrum Types
 * Types for planning, simulation, critique, and teaching
 */

import type { SimulationResult } from './simulator.js';

export interface PlanningContext {
        intent: string;
        inputs?: unknown[];
	constraints?: string[];
	preferences?: {
		risk?: 'low' | 'balanced' | 'high';
		verbosity?: 'low' | 'high';
	};
}

export interface PlanOptions {
	maxSteps?: number;
	timeoutMs?: number;
	useSimulation?: boolean;
}

export interface PlanStep {
	id: string;
	title: string;
	description: string;
	status: 'pending' | 'running' | 'completed' | 'failed';
	order: number;
	dependencies?: string[];
	tools?: string[];
	expectedDurationMs?: number;
}

export interface Plan {
	id: string;
	title: string;
	description: string;
	steps: PlanStep[];
	status: 'planning' | 'simulating' | 'approved' | 'executing' | 'completed' | 'failed';
	createdAt: string;
	updatedAt: string;
        simulationResult?: SimulationResult;
        evidenceIds?: string[];
}

export type PlanStatus = Plan['status'];
