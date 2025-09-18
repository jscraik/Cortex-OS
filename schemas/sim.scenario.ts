/**
 * SimLab Scenario Schema
 * Defines the structure for simulation scenarios used in testing agent behavior
 */

export interface SimPersona {
	/** User's locale/language (e.g., "en-US", "es-ES") */
	locale: string;
	/** Communication tone (e.g., "formal", "casual", "frustrated") */
	tone: string;
	/** Technical fluency level */
	tech_fluency: 'low' | 'med' | 'high';
	/** Additional persona attributes */
	attributes?: {
		role?: string;
		experience_level?: string;
		urgency?: 'low' | 'medium' | 'high';
		preferred_communication?: string;
	};
}

export interface SimScenario {
	/** Unique scenario identifier */
	id: string;
	/** Human-readable scenario name */
	name: string;
	/** Description of the scenario */
	description: string;
	/** Primary goal the user is trying to achieve */
	goal: string;
	/** User persona configuration */
	persona: SimPersona;
	/** Initial context/state for the scenario */
	initial_context: Record<string, unknown>;
	/** References to relevant SOPs */
	sop_refs: string[];
	/** References to knowledge base articles */
	kb_refs: string[];
	/** Success criteria for the scenario */
	success_criteria: string[];
	/** Number of variations to run (for statistical confidence) */
	variants?: number;
	/** Expected difficulty level */
	difficulty?: 'basic' | 'intermediate' | 'advanced';
	/** Scenario category/tags */
	category?: string;
	tags?: string[];
	/** Timeout for scenario execution (in seconds) */
	timeout_seconds?: number;
	/** Whether this is a critical scenario for PR gates */
	is_critical?: boolean;
}

export interface SimScenarioSet {
	/** Set metadata */
	name: string;
	version: string;
	description: string;
	/** Collection of scenarios */
	scenarios: SimScenario[];
	/** Default configuration */
	defaults?: {
		timeout_seconds?: number;
		variants?: number;
	};
}

export type { SimPersona, SimScenario, SimScenarioSet };
