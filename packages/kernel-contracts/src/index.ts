/**
 * Kernel Contracts - Shared type definitions
 * @package @cortex-os/kernel-contracts
 * @author brAInwav Team
 * 
 * This package contains shared type contracts used by both:
 * - @cortex-os/kernel
 * - @cortex-os/orchestration
 * 
 * Extracting these types breaks the circular dependency between kernel and orchestration.
 */

// N0 State types
export {
	N0SessionSchema,
	N0BudgetSchema,
	N0StateSchema,
	type N0Session,
	type N0Budget,
	type N0State,
	type N0AdapterOptions,
} from './n0-types.js';

// Kernel tool types
export {
	type BoundKernelTool,
	type BindKernelToolsOptions,
	type KernelToolBinding,
	type KernelTool,
} from './kernel-tool-types.js';
