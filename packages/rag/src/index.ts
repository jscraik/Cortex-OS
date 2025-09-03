import { AgentConfigSchema, RAGQuerySchema } from "./lib/contracts-shim.js";
import { createJsonOutput, createStdOutput, StructuredError } from "./lib/shims.js";
import { z } from "zod";
import { Qwen3Presets } from "./embed/qwen3.js";
export { PyEmbedder } from "./embed/python-client.js";
import {
	createMultiModelGenerator,
	ModelPresets,
} from "./generation/multi-model.js";
import { memoryStore } from "./store/memory.js";
export * as lib from "./lib/index.js";

const InputSchema = z.object({
	config: AgentConfigSchema,
	query: RAGQuerySchema,
	json: z.boolean().optional(),
});
export type RAGInput = z.infer<typeof InputSchema>;

export async function handleRAG(input: unknown): Promise<string> {
	const parsed = InputSchema.safeParse(input);
	if (!parsed.success) {
		const err = new StructuredError("INVALID_INPUT", "Invalid RAG input", {
			issues: parsed.error.issues,
		});
		return createJsonOutput({ error: err.toJSON() });
	}
	const { config, query, json } = parsed.data;

	const store = memoryStore();
	const embedder = Qwen3Presets.development();
	const generator = createMultiModelGenerator({
		model: ModelPresets.chat,
		defaultConfig: { maxTokens: config.maxTokens },
		timeout: config.timeoutMs,
	});

	const [embedding] = await embedder.embed([query.query]);
	const results = await store.query(embedding, query.topK);
		const context = results.map((r: { text: string }) => r.text).join("\n");
	const prompt = context ? `${context}\n\n${query.query}` : query.query;
	const answer = await generator.generate(prompt, {
		maxTokens: config.maxTokens,
	});

	const payload = {
		answer: answer.content,
		sources: results,
		provider: answer.provider,
	};
	return json ? createJsonOutput(payload) : createStdOutput(answer.content);
}
