// Using standard Request type to avoid coupling to next/server types in tooling

const MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', speed: 'fast', costTier: 'low' },
  { id: 'llama3.1:8b', label: 'Llama 3.1 8B', speed: 'fast', costTier: 'low' },
];

export async function GET(_req: Request) {
  return new Response(JSON.stringify({ models: MODELS }), {
    headers: { 'content-type': 'application/json' },
  });
}
