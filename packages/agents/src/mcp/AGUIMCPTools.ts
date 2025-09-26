/**
 * AGUI MCP Tools Integration
 *
 * Integrates AGUI MCP tools with the agents package for UI component creation
 * and management following the brAInwav Cortex-OS MCP protocol standards.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { z } from 'zod';
import { createPrefixedId } from '../lib/secure-random.js';

// AGUI MCP Tool Schemas following Cortex-OS patterns
export const CreateUIComponentSchema = z.object({
	type: z.enum(['button', 'input', 'select', 'textarea', 'modal', 'form', 'chart', 'table']),
	properties: z.object({
		id: z.string(),
		label: z.string().optional(),
		placeholder: z.string().optional(),
		required: z.boolean().default(false),
		disabled: z.boolean().default(false),
		value: z.unknown().optional(),
		className: z.string().optional(),
	}),
	styling: z
		.object({
			className: z.string().optional(),
			style: z.record(z.string()).optional(),
		})
		.optional(),
	parentId: z.string().optional(),
});

export const RenderViewSchema = z.object({
	viewId: z.string(),
	components: z.array(z.string()),
	layout: z.enum(['grid', 'flex', 'stack']).default('flex'),
	responsive: z.boolean().default(true),
	styling: z
		.object({
			className: z.string().optional(),
			style: z.record(z.string()).optional(),
		})
		.optional(),
});

export const HandleUserInteractionSchema = z.object({
	componentId: z.string(),
	eventType: z.enum(['click', 'change', 'submit', 'focus', 'blur', 'hover', 'drag']),
	value: z.unknown().optional(),
	coordinates: z
		.object({
			x: z.number(),
			y: z.number(),
		})
		.optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const UpdateComponentSchema = z.object({
	componentId: z.string(),
	updates: z.object({
		properties: z.record(z.unknown()).optional(),
		styling: z.record(z.unknown()).optional(),
		visible: z.boolean().optional(),
		disabled: z.boolean().optional(),
	}),
});

// Type definitions for AGUI MCP tools
export type CreateUIComponentInput = z.infer<typeof CreateUIComponentSchema>;
export type RenderViewInput = z.infer<typeof RenderViewSchema>;
export type HandleUserInteractionInput = z.infer<typeof HandleUserInteractionSchema>;
export type UpdateComponentInput = z.infer<typeof UpdateComponentSchema>;

// AGUI MCP Tool Interface
export interface AGUIMCPTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
	execute: (input: unknown) => Promise<unknown>;
}

/**
 * AGUI MCP Tools Collection
 */
export class AGUIMCPTools {
	private componentRegistry: Map<
		string,
		{
			id: string;
			type: string;
			properties: Record<string, unknown>;
			rendered: boolean;
			createdAt: string;
		}
	> = new Map();

	private viewRegistry: Map<
		string,
		{
			id: string;
			components: string[];
			layout: string;
			rendered: boolean;
			createdAt: string;
		}
	> = new Map();

	/**
	 * Create UI Component Tool
	 */
	createUIComponent(): AGUIMCPTool {
		return {
			name: 'create_ui_component',
			description: 'Create a new UI component for agent interfaces',
			inputSchema: CreateUIComponentSchema,
			execute: async (input: unknown) => {
				const validInput = CreateUIComponentSchema.parse(input);
				const componentId =
					validInput.properties.id ||
					createPrefixedId(`${validInput.type}-${Date.now()}`);

				const component = {
					id: componentId,
					type: validInput.type,
					properties: validInput.properties,
					rendered: true,
					createdAt: new Date().toISOString(),
				};

				this.componentRegistry.set(componentId, component);

				return {
					success: true,
					componentId,
					type: validInput.type,
					properties: validInput.properties,
					parentId: validInput.parentId,
					createdAt: component.createdAt,
					message: `UI component '${validInput.type}' created successfully`,
				};
			},
		};
	}

	/**
	 * Render View Tool
	 */
	renderView(): AGUIMCPTool {
		return {
			name: 'render_view',
			description: 'Render a complete view with multiple components',
			inputSchema: RenderViewSchema,
			execute: async (input: unknown) => {
				const validInput = RenderViewSchema.parse(input);

				// Validate that all referenced components exist
				const missingComponents = validInput.components.filter(
					(componentId) => !this.componentRegistry.has(componentId),
				);

				if (missingComponents.length > 0) {
					return {
						success: false,
						error: `Missing components: ${missingComponents.join(', ')}`,
						viewId: validInput.viewId,
					};
				}

				const view = {
					id: validInput.viewId,
					components: validInput.components,
					layout: validInput.layout,
					rendered: true,
					createdAt: new Date().toISOString(),
				};

				this.viewRegistry.set(validInput.viewId, view);

				return {
					success: true,
					viewId: validInput.viewId,
					components: validInput.components,
					layout: validInput.layout,
					responsive: validInput.responsive,
					renderedAt: view.createdAt,
					message: `View '${validInput.viewId}' rendered successfully with ${validInput.components.length} components`,
				};
			},
		};
	}

	/**
	 * Handle User Interaction Tool
	 */
	handleUserInteraction(): AGUIMCPTool {
		return {
			name: 'handle_user_interaction',
			description: 'Process user interaction events',
			inputSchema: HandleUserInteractionSchema,
			execute: async (input: unknown) => {
				const validInput = HandleUserInteractionSchema.parse(input);

				// Validate that the component exists
				const component = this.componentRegistry.get(validInput.componentId);
				if (!component) {
					return {
						success: false,
						error: `Component '${validInput.componentId}' not found`,
						interactionId: null,
					};
				}

				const interactionId = createPrefixedId(`int-${Date.now()}`);

				return {
					success: true,
					interactionId,
					componentId: validInput.componentId,
					eventType: validInput.eventType,
					value: validInput.value,
					coordinates: validInput.coordinates,
					processedAt: new Date().toISOString(),
					componentType: component.type,
					message: `Interaction '${validInput.eventType}' processed for component '${validInput.componentId}'`,
				};
			},
		};
	}

	/**
	 * Update Component Tool
	 */
	updateComponent(): AGUIMCPTool {
		return {
			name: 'update_component',
			description: 'Update properties of an existing component',
			inputSchema: UpdateComponentSchema,
			execute: async (input: unknown) => {
				const validInput = UpdateComponentSchema.parse(input);

				// Validate that the component exists
				const component = this.componentRegistry.get(validInput.componentId);
				if (!component) {
					return {
						success: false,
						error: `Component '${validInput.componentId}' not found`,
						componentId: validInput.componentId,
					};
				}

				// Apply updates
				const updatedComponent = {
					...component,
					properties: {
						...component.properties,
						...validInput.updates.properties,
					},
				};

				// Handle visibility and disabled state
				if (validInput.updates.visible !== undefined) {
					updatedComponent.properties.visible = validInput.updates.visible;
				}
				if (validInput.updates.disabled !== undefined) {
					updatedComponent.properties.disabled = validInput.updates.disabled;
				}

				this.componentRegistry.set(validInput.componentId, updatedComponent);

				return {
					success: true,
					componentId: validInput.componentId,
					updates: validInput.updates,
					updatedAt: new Date().toISOString(),
					componentType: component.type,
					message: `Component '${validInput.componentId}' updated successfully`,
				};
			},
		};
	}

	/**
	 * Get Component Info Tool
	 */
	getComponentInfo(): AGUIMCPTool {
		return {
			name: 'get_component_info',
			description: 'Get information about a specific component',
			inputSchema: z.object({
				componentId: z.string(),
			}),
			execute: async (input: unknown) => {
				const validInput = z.object({ componentId: z.string() }).parse(input);
				const component = this.componentRegistry.get(validInput.componentId);

				if (!component) {
					return {
						success: false,
						error: `Component '${validInput.componentId}' not found`,
						componentId: validInput.componentId,
					};
				}

				return {
					success: true,
					componentId: validInput.componentId,
					type: component.type,
					properties: component.properties,
					rendered: component.rendered,
					createdAt: component.createdAt,
				};
			},
		};
	}

	/**
	 * List Components Tool
	 */
	listComponents(): AGUIMCPTool {
		return {
			name: 'list_components',
			description: 'List all registered UI components',
			inputSchema: z
				.object({
					type: z.string().optional(),
					rendered: z.boolean().optional(),
				})
				.optional()
				.default({}),
			execute: async (input: unknown) => {
				const validInput = z
					.object({
						type: z.string().optional(),
						rendered: z.boolean().optional(),
					})
					.optional()
					.default({})
					.parse(input || {});

				let components = Array.from(this.componentRegistry.values());

				// Apply filters
				if (validInput.type) {
					components = components.filter((c) => c.type === validInput.type);
				}
				if (validInput.rendered !== undefined) {
					components = components.filter((c) => c.rendered === validInput.rendered);
				}

				return {
					success: true,
					components: components.map((c) => ({
						id: c.id,
						type: c.type,
						rendered: c.rendered,
						createdAt: c.createdAt,
					})),
					total: components.length,
					filters: validInput,
				};
			},
		};
	}

	/**
	 * Get all available AGUI MCP tools
	 */
	getAllTools(): AGUIMCPTool[] {
		return [
			this.createUIComponent(),
			this.renderView(),
			this.handleUserInteraction(),
			this.updateComponent(),
			this.getComponentInfo(),
			this.listComponents(),
		];
	}

	/**
	 * Get tool by name
	 */
	getTool(name: string): AGUIMCPTool | undefined {
		return this.getAllTools().find((tool) => tool.name === name);
	}

	/**
	 * Execute tool by name
	 */
	async executeTool(name: string, input: unknown): Promise<unknown> {
		const tool = this.getTool(name);
		if (!tool) {
			throw new Error(`AGUI MCP tool '${name}' not found`);
		}

		try {
			return await tool.execute(input);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				tool: name,
				input,
			};
		}
	}

	/**
	 * Get component registry status
	 */
	getStatus(): {
		componentsCount: number;
		viewsCount: number;
		tools: string[];
		timestamp: string;
	} {
		return {
			componentsCount: this.componentRegistry.size,
			viewsCount: this.viewRegistry.size,
			tools: this.getAllTools().map((tool) => tool.name),
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Clear all registries (for testing)
	 */
	clear(): void {
		this.componentRegistry.clear();
		this.viewRegistry.clear();
	}
}

/**
 * Factory function to create AGUI MCP tools instance
 */
export function createAGUIMCPTools(): AGUIMCPTools {
	return new AGUIMCPTools();
}
