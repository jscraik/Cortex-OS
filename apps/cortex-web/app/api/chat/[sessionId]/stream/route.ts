import { getSession, addMessage } from '../../../../../utils/chat-store';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // For MVP, echo last user message with a simple transformation
      const enc = new TextEncoder();
      const session = getSession(sessionId);
      const lastUser = [...session.messages].reverse().find((m) => m.role === 'user');
      if (!lastUser) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'error', error: 'no message' })}\n\n`));
        controller.close();
        return;
      }

      const text = `Echo: ${lastUser.content}`;
      for (const ch of text) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'token', data: ch })}\n\n`));
        await new Promise((r) => setTimeout(r, 10));
      }

      const finalId = crypto.randomUUID();
      addMessage(sessionId, { id: finalId, role: 'assistant', content: text });
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'done', messageId: finalId, text })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
