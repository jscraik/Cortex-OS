import { streamChat } from "../../../../../utils/chat-gateway";
import { addMessage, getSession } from "../../../../../utils/chat-store";
import {
	logEvent,
	makeDoneEvent,
	makeStartEvent,
} from "../../../../../utils/observability";

export const runtime = "nodejs";

export async function GET(
	_req: Request,
	{ params }: { params: { sessionId: string } },
) {
	const { sessionId } = params;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const enc = new TextEncoder();
			const session = getSession(sessionId);
			const lastUser = [...session.messages]
				.reverse()
				.find((m) => m.role === "user");
			if (!lastUser) {
				controller.enqueue(
					enc.encode(
						`data: ${JSON.stringify({ type: "error", error: "no message" })}\n\n`,
					),
				);
				controller.close();
				return;
			}

			const startedAt = Date.now();
			let tokenCount = 0;
			const OBS =
				process.env.CHAT_OBSERVABILITY === "1" ||
				process.env.CHAT_OBSERVABILITY === "true";
			const model = session.modelId || "qwen2.5-0.5b";
			if (OBS) {
				logEvent(
					makeStartEvent({
						sessionId,
						model,
						lastUserId: lastUser.id,
					}),
				);
			}

			const { text } = await streamChat(
				{ model, messages: session.messages },
				(tok) => {
					tokenCount += tok.length;
					controller.enqueue(
						enc.encode(
							`data: ${JSON.stringify({ type: "token", data: tok })}\n\n`,
						),
					);
				},
			);

			const finalId = crypto.randomUUID();
			addMessage(sessionId, { id: finalId, role: "assistant", content: text });
			const durationMs = Date.now() - startedAt;
			controller.enqueue(
				enc.encode(
					`data: ${JSON.stringify({ type: "done", messageId: finalId, text, metrics: { durationMs, tokenCount } })}\n\n`,
				),
			);
			if (OBS) {
				logEvent(
					makeDoneEvent({
						sessionId,
						model,
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
			"content-type": "text/event-stream; charset=utf-8",
			"cache-control": "no-cache, no-transform",
			connection: "keep-alive",
		},
	});
}
