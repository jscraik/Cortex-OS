/**
 * Mock implementations for voltagent-core dependencies
 */

import type { z } from 'zod';

export interface EventBus {
	subscribe(eventType: string, handler: (event: any) => void): void;
	publish(eventType: string, event: any): void;
	unsubscribe(eventType: string, handler: (event: any) => void): void;
}

export const createEventBus = (): EventBus => {
	const handlers = new Map<string, ((event: any) => void)[]>();

	return {
		subscribe(eventType: string, handler: (event: any) => void) {
			if (!handlers.has(eventType)) {
				handlers.set(eventType, []);
			}
			handlers.get(eventType)?.push(handler);
		},

		publish(eventType: string, event: any) {
			const eventHandlers = handlers.get(eventType) || [];
			eventHandlers.forEach((handler) => {
				try {
					handler(event);
				} catch (error) {
					console.error(`Error in event handler for ${eventType}:`, error);
				}
			});
		},

		unsubscribe(eventType: string, handler: (event: any) => void) {
			const eventHandlers = handlers.get(eventType);
			if (eventHandlers) {
				const index = eventHandlers.indexOf(handler);
				if (index > -1) {
					eventHandlers.splice(index, 1);
				}
			}
		},
	};
};

export const eventBus = createEventBus();

export default eventBus;

export type ToolSchema = z.ZodType<any>;

export abstract class Agent {
	constructor(config: {
		name: string;
		instructions?: string;
		model?: string;
		type?: string;
		capabilities?: string[];
	}) {
		this.name = config.name;
		this.type = config.type || 'agent';
		this.capabilities = config.capabilities || [];
	}

	public readonly name: string;
	public readonly type: string;
	public readonly capabilities: string[];

	abstract run(input: any): Promise<any>;

	abstract generateText(input: string, options?: any): Promise<any>;

	abstract addTools(tools: Tool<any>[]): void;

	abstract getTools(): Tool<any>[];
}

export abstract class Tool<T extends ToolSchema = ToolSchema> {
	readonly name: string;
	readonly description: string;
	readonly schema: T;

	constructor(config: {
		name: string;
		description: string;
		schema: T;
	}) {
		this.name = config.name;
		this.description = config.description;
		this.schema = config.schema;
	}

	abstract execute(input: z.infer<T>): Promise<any>;
}

export function createTool<T extends ToolSchema>(
	config: {
		name: string;
		description: string;
		schema: T;
	},
	execute: (input: z.infer<T>) => Promise<any>,
): Tool<T> {
	return new (class extends Tool<T> {
		constructor() {
			super(config);
		}

		async execute(input: z.infer<T>): Promise<any> {
			return await execute(input);
		}
	})();
}
