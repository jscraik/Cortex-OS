import { z } from 'zod';
import { addMessage, setModel } from '../../../../../utils/chat-store';

const bodySchema = z.object({
  content: z.string().min(1).max(8000),
  modelId: z.string().optional(),
  messageId: z.string().uuid().optional(),
});

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const body = bodySchema.parse(await req.json());
  if (body.modelId) setModel(sessionId, body.modelId);

  const id = body.messageId || crypto.randomUUID();
  addMessage(sessionId, { id, role: 'user', content: body.content });

  return new Response(JSON.stringify({ messageId: id }), {
    headers: { 'content-type': 'application/json' },
  });
}
