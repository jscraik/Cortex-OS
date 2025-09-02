import { z } from "zod";

export const decomposeTaskSchema = z.object({
	taskDescription: z.string().min(1),
	availableAgents: z.array(z.string().min(1)),
	constraints: z
		.object({
			maxParallelism: z.number().int().positive().optional(),
			timeLimit: z.number().int().positive().optional(),
		})
		.optional(),
});

export const coordinateMultiModalTaskSchema = z.object({
	taskDescription: z.string().min(1),
	visualContext: z.string().optional(),
	codeContext: z.string().optional(),
});

export const orchestrateCodeTaskSchema = z.object({
	codeTask: z.string().min(1),
	codebase: z.string().optional(),
	testRequirements: z.string().optional(),
});

export const coordinateWorkflowSchema = z.object({
	workflowId: z.string().min(1),
	currentState: z.unknown(),
	incomingEvents: z.array(z.unknown()),
});

export const selectOptimalAgentSchema = z.object({
	taskDescription: z.string().min(1),
	availableAgents: z.array(
		z.object({
			id: z.string(),
			capabilities: z.array(z.string()),
			currentLoad: z.number().int().nonnegative(),
		}),
	),
	urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export const validateTaskSafetySchema = z.object({
	taskDescription: z.string().min(1),
	context: z.string().optional(),
});
