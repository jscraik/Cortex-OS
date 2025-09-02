declare module "@cortex-os/contracts" {
	export interface A2AMessage {
		action: string;
		params?: any;
	}

	export interface AgentConfigSchema {}

	export const TOKENS: Record<string, any>;

	export type RAGQuerySchema = any;
	export type MCPRequestSchema = any;
}
