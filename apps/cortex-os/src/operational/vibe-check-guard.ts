import { z } from 'zod';
import { callVibeCheck, updateConstitution, type VibeCheckResult } from '../mcp/clients/vibe-check-client.js';

const GuardInput = z.object({
  goal: z.string().min(1),
  plan: z.string().min(1),
  sessionId: z.string().min(1),
  rules: z.array(z.string()).optional(),
});

export type VibeCheckGuardInput = z.infer<typeof GuardInput>;

export async function runVibeCheckGuard(input: VibeCheckGuardInput): Promise<VibeCheckResult> {
  const { goal, plan, sessionId, rules } = GuardInput.parse(input);
  if (rules && rules.length) {
    await updateConstitution({ sessionId, rules });
  }
  const result = await callVibeCheck({ goal, plan, sessionId });
  return result;
}
