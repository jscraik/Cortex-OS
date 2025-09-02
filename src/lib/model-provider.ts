import { createLogger } from "@cortex-os/mvp-core";
import { z } from "zod";

const logger = createLogger("model-provider");

const promptSchema = z.string();

export async function requestMLX(
	prompt: string,
	url = "http://localhost:8001/inference",
): Promise<unknown> {
	const validPrompt = promptSchema.parse(prompt);
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ prompt: validPrompt }),
	});
	if (!response.ok) {
		throw new Error(`MLX request failed: ${response.status}`);
	}
	return response.json();
}

export async function requestOllama(
	prompt: string,
	url = "http://localhost:11434/api/generate",
): Promise<unknown> {
	const validPrompt = promptSchema.parse(prompt);
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ prompt: validPrompt }),
	});
	if (!response.ok) {
		throw new Error(`Ollama request failed: ${response.status}`);
	}
	return response.json();
}

export async function requestModel(
	prompt: string,
	options?: { mlxUrl?: string; ollamaUrl?: string },
): Promise<unknown> {
	try {
		return await requestMLX(prompt, options?.mlxUrl);
	} catch (error) {
		logger.error({ error }, "MLX request failed");
		if (process.env.ENABLE_OLLAMA !== "true") {
			throw error;
		}
		logger.warn("Falling back to Ollama");
		return requestOllama(prompt, options?.ollamaUrl);
	}
}
