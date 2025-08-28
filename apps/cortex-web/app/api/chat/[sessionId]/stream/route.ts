import { streamChat } from '../../../../../utils/chat-gateway';
import { addMessage, getSession } from '../../../../../utils/chat-store';
import { logEvent, makeDoneEvent, makeStartEvent } from '../../../../../utils/observability';
import { addToolEvent } from '../../../../../utils/tool-store';

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

      const startedAt = Date.now();
      let tokenCount = 0;
      const OBS =
        process.env.CHAT_OBSERVABILITY === '1' || process.env.CHAT_OBSERVABILITY === 'true';
      if (OBS) {
        logEvent(
          makeStartEvent({
            sessionId,
            model: session.modelId,
            lastUserId: lastUser.id,
          }),
        );
      }
      // Write a start event (Open WebUI compatible)
      controller.enqueue(
        enc.encode(`data: ${JSON.stringify({ type: 'start', model: session.modelId })}\n\n`),
      );

      // Example: announce a fictional tool call (placeholder for real tool invocations)
      const toolId = crypto.randomUUID();
      const startTool = addToolEvent(sessionId, {
        id: toolId,
        name: 'policy/redaction-check',
        status: 'start',
        args: { sample: 'Checking content policy', token: 'shh-should-be-redacted' },
      });
      controller.enqueue(
        enc.encode(
          `data: ${JSON.stringify({ type: 'tool', id: startTool.id, name: startTool.name, status: startTool.status, args: startTool.args })}\n\n`,
        ),
      );

      const { text } = await streamChat(
        { model: session.modelId || 'qwen2.5-0.5b', messages: session.messages },
        (tok) => {
          tokenCount += tok.length;
          controller.enqueue(
            enc.encode(`data: ${JSON.stringify({ type: 'token', data: tok })}\n\n`),
          );
        },
      );

      // Mark tool completion
      const endTool = addToolEvent(sessionId, {
        id: toolId,
        name: 'policy/redaction-check',
        status: 'complete',
      });
      controller.enqueue(
        enc.encode(
          `data: ${JSON.stringify({ type: 'tool', id: endTool.id, name: endTool.name, status: endTool.status })}\n\n`,
        ),
      );

      const finalId = crypto.randomUUID();
      addMessage(sessionId, { id: finalId, role: 'assistant', content: text });
      const durationMs = Date.now() - startedAt;
      controller.enqueue(
        enc.encode(
          `data: ${JSON.stringify({ type: 'done', messageId: finalId, text, metrics: { durationMs, tokenCount } })}\n\n`,
        ),
      );
      if (OBS) {
        logEvent(
          makeDoneEvent({
            sessionId,
            model: session.modelId,
            messageId: finalId,
            durationMs,
            tokenCount,
            textSize: text.length,
          }),
        );
      }
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
