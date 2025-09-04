import { z } from "zod";

export const simPersonaSchema = z.object({
  locale: z.string(),
  tone: z.string(),
  tech_fluency: z.enum(["low", "med", "high"]),
  attributes: z
    .object({
      role: z.string().optional(),
      experience_level: z.string().optional(),
      urgency: z.enum(["low", "medium", "high"]).optional(),
      preferred_communication: z.string().optional(),
    })
    .partial()
    .optional(),
});

export const simScenarioSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  goal: z.string(),
  persona: simPersonaSchema,
  initial_context: z.record(z.unknown()),
  sop_refs: z.array(z.string()),
  kb_refs: z.array(z.string()),
  success_criteria: z.array(z.string()),
  variants: z.number().int().positive().optional(),
  difficulty: z.enum(["basic", "intermediate", "advanced"]).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  timeout_seconds: z.number().int().positive().optional(),
  is_critical: z.boolean().optional(),
});

export const simTurnSchema = z.object({
  role: z.enum(["user", "agent", "tool"]),
  content: z.string(),
  timestamp: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const agentRequestSchema = z.object({
  scenario: simScenarioSchema,
  conversationHistory: z.array(simTurnSchema),
  userMessage: z.string(),
});

export type AgentRequestInput = z.infer<typeof agentRequestSchema>;
export type SimScenarioInput = z.infer<typeof simScenarioSchema>;
