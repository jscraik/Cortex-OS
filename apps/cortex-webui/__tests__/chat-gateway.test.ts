import { describe, expect, it, vi } from "vitest";
import * as gateway from "../utils/chat-gateway";

// Helper to create a ReadableStream that yields provided chunks
function streamFromLines(lines: string[]): ReadableStream<Uint8Array> {
	const enc = new TextEncoder();
	return new ReadableStream<Uint8Array>({
		start(controller) {
			for (const l of lines) controller.enqueue(enc.encode(`${l}\n`));
			controller.close();
		},
	});
}

describe("chat-gateway", () => {
	it("throws when provider not configured", async () => {
		const prev = process.env.MODEL_API_PROVIDER;
		delete process.env.MODEL_API_PROVIDER;
		const onTok = vi.fn();
		await expect(
			gateway.streamChat(
				{
					model: "test",
					messages: [{ role: "user", content: "Hi" }] as unknown,
				},
				onTok,
			),
		).rejects.toThrow(/MODEL_API_PROVIDER/);
		expect(onTok).not.toHaveBeenCalled();
		if (prev === undefined) delete process.env.MODEL_API_PROVIDER;
		else process.env.MODEL_API_PROVIDER = prev;
	});

	it("propagates upstream errors", async () => {
		const prev = process.env.MODEL_API_PROVIDER;
		process.env.MODEL_API_PROVIDER = "openai";
		const originalFetch = globalThis.fetch as unknown;
		globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
		const onTok = vi.fn();
		await expect(
			gateway.streamChat(
				{
					model: "test",
					messages: [{ role: "user", content: "Hi" }] as unknown,
				},
				onTok,
			),
		).rejects.toThrow(/Upstream chat request failed/);
		expect(onTok).not.toHaveBeenCalled();
		globalThis.fetch = originalFetch;
		if (prev === undefined) delete process.env.MODEL_API_PROVIDER;
		else process.env.MODEL_API_PROVIDER = prev;
	});

	it("parses OpenAI-compatible SSE chunks and yields tokens", async () => {
		const prev = process.env.MODEL_API_PROVIDER;
		process.env.MODEL_API_PROVIDER = "openai";
		const lines = [
			`data: ${JSON.stringify({ choices: [{ delta: { content: "He" } }] })}`,
			`data: ${JSON.stringify({ choices: [{ delta: { content: "llo" } }] })}`,
			"data: [DONE]",
		];

		const body = streamFromLines(lines);
		const originalFetch = globalThis.fetch as unknown;
		globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body });

		const tokens: string[] = [];
		const res = await gateway.streamChat(
			{
				model: "test",
				messages: [{ role: "user", content: "Hello" }] as unknown,
			},
			(t) => tokens.push(t),
		);

		expect(tokens.join("")).toBe("Hello");
		expect(res.text).toBe("Hello");

		globalThis.fetch = originalFetch;
		if (prev === undefined) delete process.env.MODEL_API_PROVIDER;
		else process.env.MODEL_API_PROVIDER = prev;
	});
});
