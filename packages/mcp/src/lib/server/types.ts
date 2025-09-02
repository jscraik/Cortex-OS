export type JsonSchema = {
	type?: string;
	required?: string[];
	properties?: Record<string, { type?: string; maxLength?: number }>;
	additionalProperties?: boolean;
};

export type ToolDef = {
	name: string;
	description?: string;
	inputSchema?: JsonSchema;
};
export type ToolHandler = (
	args: Record<string, unknown>,
) => Promise<unknown> | unknown;

export type ResourceDef = {
	uri: string;
	name?: string;
	description?: string;
	mimeType?: string;
};
export type ResourceHandler = (
	uri: string,
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export type PromptDef = { name: string; description?: string };
export type PromptHandler = (
	args?: Record<string, unknown>,
) => Promise<unknown> | unknown;

export interface ServerContext {
	options: { name: string; version: string };
	tools: Map<string, { def: ToolDef; handler: ToolHandler }>;
	resources: Map<string, { def: ResourceDef; handler: ResourceHandler }>;
	prompts: Map<string, { def: PromptDef; handler: PromptHandler }>;
	subscriptions: Map<string, { uri?: string; queue: any[] }>;
	templates: Map<string, { name: string; template: string }>;
}
