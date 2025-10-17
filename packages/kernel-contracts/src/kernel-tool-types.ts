/**
 * Kernel Tool Types - Shared contracts for tool binding
 * @package @cortex-os/kernel-contracts
 * @author brAInwav Team
 */

import type { z } from 'zod';

/**
 * A bound kernel tool ready for execution with brAInwav policies applied
 */
export interface BoundKernelTool<Result = unknown> {
	name: string;
	description: string;
	schema: z.ZodTypeAny;
	execute: (input: unknown) => Promise<Result>;
}

/**
 * Configuration options for binding kernel tools with security policies
 */
export interface BindKernelToolsOptions {
	cwd?: string;
	shell?: {
		allow?: string[];
		timeoutMs?: number;
	};
	filesystem?: {
		allow?: string[];
		maxBytes?: number;
	};
	http?: {
		allow?: string[];
		timeoutMs?: number;
		maxBytes?: number;
	};
}

/**
 * Result of kernel tool binding operation
 */
export interface KernelToolBinding {
	tools: BoundKernelTool[];
	metadata: {
		boundAt: string;
		cwd: string;
		policies: {
			shell: boolean;
			filesystem: boolean;
			http: boolean;
		};
	};
}

/**
 * Generic kernel tool definition (pre-binding)
 */
export interface KernelTool {
	name: string;
	description: string;
	handler: (input: unknown) => Promise<unknown>;
}
