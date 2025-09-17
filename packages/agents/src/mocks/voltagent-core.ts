// Mock implementations for @voltagent/core
import { z } from 'zod';

export interface ToolContext {
	sessionId?: string;
	userId?: string;
	metadata?: Record<string, any>;
}

export interface ToolDefinition<T = any> {
	id: string;
	name: string;
	description: string;
	parameters: z.ZodType<T>;
	execute: (params: T, context: ToolContext) => Promise<any> | any;
}

export function createTool<T = any>(
	definition: ToolDefinition<T>,
): ToolDefinition<T> {
	return definition;
}

// Mock VoltAgent class
export class VoltAgent {
	constructor(public config: any) {}

	addTool(_tool: ToolDefinition): void {
		// Mock implementation
	}

	addMemory(_memory: Memory): void {
		// Mock implementation
	}

	async run(): Promise<any> {
		return { success: true, message: 'Mock agent execution' };
	}

	async execute(input?: string, options?: any): Promise<any> {
		return { success: true, message: 'Mock agent execution', input, options };
	}
}

// Mock Memory interface
export interface Memory {
	id: string;
	content: string;
	type: string;
	tags: string[];
	importance: number;
	timestamp: string;
}

// Mock Tool type
export type Tool = ToolDefinition;

export { z };
