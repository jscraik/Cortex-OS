import { z } from 'zod';

// AGUI (Agent GUI) MCP Tool Schemas
const CreateUIComponentInputSchema = z.object({
	type: z.enum(['button', 'input', 'select', 'textarea', 'modal', 'form']),
	properties: z.object({
		id: z.string(),
		label: z.string().optional(),
		placeholder: z.string().optional(),
		required: z.boolean().default(false),
		disabled: z.boolean().default(false),
	}),
	styling: z
		.object({
			className: z.string().optional(),
			style: z.record(z.string()).optional(),
		})
		.optional(),
});

const RenderViewInputSchema = z.object({
	viewId: z.string(),
	components: z.array(z.record(z.unknown())),
	layout: z.enum(['grid', 'flex', 'stack']).default('flex'),
	responsive: z.boolean().default(true),
});

const HandleUserInteractionInputSchema = z.object({
	componentId: z.string(),
	eventType: z.enum(['click', 'change', 'submit', 'focus', 'blur']),
	value: z.unknown().optional(),
	metadata: z.record(z.unknown()).optional(),
});

const UpdateComponentInputSchema = z.object({
	componentId: z.string(),
	updates: z.object({
		properties: z.record(z.unknown()).optional(),
		styling: z.record(z.unknown()).optional(),
		visible: z.boolean().optional(),
	}),
});

// AGUI MCP Tool Definitions
export interface AGUITool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const aguiMcpTools: AGUITool[] = [
	{
		name: 'create_ui_component',
		description: 'Create a new UI component for agent interfaces',
		inputSchema: CreateUIComponentInputSchema,
	},
	{
		name: 'render_view',
		description: 'Render a complete view with multiple components',
		inputSchema: RenderViewInputSchema,
	},
	{
		name: 'handle_user_interaction',
		description: 'Process user interaction events',
		inputSchema: HandleUserInteractionInputSchema,
	},
	{
		name: 'update_component',
		description: 'Update properties of an existing component',
		inputSchema: UpdateComponentInputSchema,
	},
];

// Export types for external use
export type CreateUIComponentInput = z.infer<typeof CreateUIComponentInputSchema>;
export type RenderViewInput = z.infer<typeof RenderViewInputSchema>;
export type HandleUserInteractionInput = z.infer<typeof HandleUserInteractionInputSchema>;
export type UpdateComponentInput = z.infer<typeof UpdateComponentInputSchema>;
