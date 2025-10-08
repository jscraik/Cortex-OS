import {
	capturePromptUsage,
	getPrompt,
	renderPrompt,
	validatePromptUsage,
} from '@cortex-os/prompts';
import type { MultiModelGenerator } from '../generation/multi-model.js';
import type { Document } from './types.js';

const DEFAULT_RAG_PROMPT_ID = 'sys.a2a.rag-default' as const;

function buildContext(documents: Document[], maxLength?: number): string {
	const contexts = documents.map((doc, index) => `[Document ${index + 1}]\n${doc.content}\n`);
	let context = contexts.join('\n');
	if (maxLength && context.length > maxLength) {
		context = `${context.substring(0, maxLength)}...`;
	}
	return context;
}

function resolveSystemPrompt(customPrompt?: string): string {
	if (customPrompt) {
		const registered = getPrompt(customPrompt);
		if (registered) {
			const rendered = renderPrompt(registered, {});
			validatePromptUsage(rendered, registered.id);
			capturePromptUsage(registered);
			return rendered;
		}

		validatePromptUsage(customPrompt);
		return customPrompt;
	}

	const defaultRecord = getPrompt(DEFAULT_RAG_PROMPT_ID);
	if (!defaultRecord) {
		throw new Error(
			`brAInwav RAG prompt '${DEFAULT_RAG_PROMPT_ID}' must be registered in the prompt library`,
		);
	}

	const rendered = renderPrompt(defaultRecord, {});
	validatePromptUsage(rendered, defaultRecord.id);
	capturePromptUsage(defaultRecord);
	return rendered;
}

function buildPrompt(query: string, context: string, customPrompt?: string): string {
	const systemPrompt = resolveSystemPrompt(customPrompt);
	return `${systemPrompt}\n\nContext:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;
}

export async function generateAnswer(
	generator: MultiModelGenerator,
	query: string,
	documents: Document[],
	options?: { contextPrompt?: string; maxContextLength?: number },
) {
	const context = buildContext(documents, options?.maxContextLength);
	const prompt = buildPrompt(query, context, options?.contextPrompt);
	const response = await generator.generate(prompt, {
		maxTokens: 2048,
		temperature: 0.7,
	});
	return {
		answer: response.content,
		provider: response.provider,
		usage: response.usage,
	};
}
