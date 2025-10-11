import { z } from 'zod';

const Env = {
  url: process.env.VIBE_CHECK_HTTP_URL ?? 'http://127.0.0.1:2091',
};

const VibeCheckInput = z.object({
  goal: z.string().min(1),
  plan: z.string().min(1),
  sessionId: z.string().min(1),
});

const VibeCheckOutput = z.object({
  questions: z.array(z.string()).default([]),
  risk: z.enum(['low', 'medium', 'high']).optional(),
  notes: z.array(z.string()).optional(),
});
export type VibeCheckResult = z.infer<typeof VibeCheckOutput>;

const ConstitutionRules = z.object({ rules: z.array(z.string()).min(1), sessionId: z.string().min(1) });

async function postTool<TOut>(name: string, args: unknown, schema: z.ZodSchema<TOut>): Promise<TOut> {
  const url = `${Env.url.replace(/\/$/, '')}/tools/call`;
  const body = JSON.stringify({ name, arguments: args });
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`brAInwav-vibe-check: HTTP ${res.status} ${res.statusText} — ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const payload = (json && typeof json === 'object' && 'result' in json ? (json as any).result : json) as unknown;
  return schema.parse(payload);
}

export async function callVibeCheck(input: { goal: string; plan: string; sessionId: string }): Promise<VibeCheckResult> {
  const parsed = VibeCheckInput.parse(input);
  return postTool('vibe_check', parsed, VibeCheckOutput);
}

export async function updateConstitution(params: { sessionId: string; rules: string[] }): Promise<{ ok: true }>{
  const parsed = ConstitutionRules.parse(params);
  await postTool('update_constitution', parsed, z.any());
  return { ok: true };
}

export async function resetConstitution(params: { sessionId: string }): Promise<{ ok: true }>{
  const parsed = z.object({ sessionId: z.string().min(1) }).parse(params);
  await postTool('reset_constitution', parsed, z.any());
  return { ok: true };
}

export async function checkConstitution(params: { sessionId: string }): Promise<{ rules?: string[] }>{
  const parsed = z.object({ sessionId: z.string().min(1) }).parse(params);
  const out = await postTool('check_constitution', parsed, z.object({ rules: z.array(z.string()).optional() }));
  return out;
}
