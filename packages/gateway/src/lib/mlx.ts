import { createModelRouter } from "@cortex-os/model-gateway";

const router = createModelRouter();
let initialized = false;
async function ensureInit() {
	if (!initialized) {
		await router.initialize();
		initialized = true;
	}
}

export async function generateEmbedding(text: string, model?: string) {
	await ensureInit();
	return router.generateEmbedding({ text, model });
}

export async function rerank(
	query: string,
	documents: string[],
	model?: string,
) {
	await ensureInit();
	return router.rerank({ query, documents, model });
}
