import { z } from 'zod';
type MCPToolResponse = {
	content: Array<{
		type: 'text';
		text: string;
	}>;
	metadata: {
		correlationId: string;
		timestamp: string;
		tool: string;
	};
	isError?: boolean;
};
type MCPToolDefinition = {
	name: string;
	description: string;
	inputSchema: z.ZodTypeAny;
	handler: (params: unknown) => Promise<MCPToolResponse>;
};
export declare const workflowOrchestrationTool: MCPToolDefinition;
export declare const taskManagementTool: MCPToolDefinition;
export declare const processMonitoringTool: MCPToolDefinition;
export declare const orchestrationMcpTools: any[];
export declare const orchestrationSecurityToolAllowList: string[];
export { __resetOrchestrationMcpState, configureOrchestrationMcp } from './core-adapter.js';
import { ToolErrorCode } from './tool-errors.js';
export { ToolErrorCode, ToolValidationError } from './tool-errors.js';
export interface ToolContract {
	name: string;
	description: string;
	inputSchema: z.ZodTypeAny;
	resultSchema: z.ZodTypeAny;
	validateInput: (input: unknown) => unknown;
	errors: Record<ToolErrorCode, string>;
}
export declare const workflowOrchestrationTools: ToolContract[];
export declare const taskManagementTools: ToolContract[];
export declare const processMonitoringTools: ToolContract[];
export declare const toolErrorResponseSchema: z.ZodObject<
	{
		code: z.ZodNativeEnum<typeof ToolErrorCode>;
		message: z.ZodString;
		details: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
		retryable: z.ZodOptional<z.ZodBoolean>;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		code: ToolErrorCode;
		message: string;
		timestamp: string;
		retryable?: boolean | undefined;
		details?: string[] | undefined;
	},
	{
		code: ToolErrorCode;
		message: string;
		timestamp: string;
		retryable?: boolean | undefined;
		details?: string[] | undefined;
	}
>;
export type ToolErrorResponse = z.infer<typeof toolErrorResponseSchema>;
export declare function createToolErrorResponse(
	code: ToolErrorCode,
	message: string,
	options?: {
		details?: string[];
		retryable?: boolean;
	},
): ToolErrorResponse;
export declare const orchestrationToolContracts: ToolContract[];
//# sourceMappingURL=tools.d.ts.map
