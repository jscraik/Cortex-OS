import { getSession, addMessage } from '../../../../../utils/chat-store';
import { streamChat } from '../../../../../utils/chat-gateway';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const session = getSession(sessionId);
      const lastUser = [...session.messages].reverse().find((m) => m.role === 'user');
      if (!lastUser) {
        controller.enqueue(
          enc.encode(`data: ${JSON.stringify({ type: 'error', error: 'no message' })}\n\n`),
        );
        controller.close();
        return;
      }

      // Write a start event (Open WebUI compatible)
      controller.enqueue(
        enc.encode(`data: ${JSON.stringify({ type: 'start', model: session.modelId })}\n\n`),
      );

      const { text } = await streamChat(
        { model: session.modelId || 'qwen2.5-0.5b', messages: session.messages },
        (tok) =>
          controller.enqueue(
            enc.encode(`data: ${JSON.stringify({ type: 'token', data: tok })}\n\n`),
          ),
      );

      const finalId = crypto.randomUUID();
      addMessage(sessionId, { id: finalId, role: 'assistant', content: text });
      controller.enqueue(
        enc.encode(`data: ${JSON.stringify({ type: 'done', messageId: finalId, text })}\n\n`),
      );
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
