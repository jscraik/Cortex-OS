import { getPrompt, renderPrompt, validatePromptUsage } from '@cortex-os/prompts';
import type { MultiModelGenerator } from '../generation/multi-model.js';
import type { Document } from './types.js';

const DEFAULT_CONTEXT_PROMPT_ID = 'sys.a2a.rag-default';

type ContextPromptOptions = {
	id?: string;
	variables?: Record<string, unknown>;
};

type GenerateAnswerOptions = {
	contextPromptId?: string;
	contextPromptVariables?: Record<string, unknown>;
	contextPrompt?: string;
	maxContextLength?: number;
};

function buildContext(documents: Document[], maxLength?: number): string {
	const contexts = documents.map((doc, index) => `[Document ${index + 1}]\n${doc.content}\n`);
	let context = contexts.join('\n');
	if (maxLength && context.length > maxLength) {
		context = `${context.substring(0, maxLength)}...`;
	}
	return context;
}

function resolveContextPrompt(options: ContextPromptOptions = {}): string {
	const promptId = options.id ?? DEFAULT_CONTEXT_PROMPT_ID;
	const record = getPrompt(promptId);
	if (!record) {
		throw new Error(`brAInwav RAG: Prompt '${promptId}' is not registered in the prompt library.`);
	}

	const rendered = renderPrompt(record, options.variables ?? {});
	validatePromptUsage(rendered, promptId);
	return rendered;
}

function buildPrompt(
	query: string,
	context: string,
	promptOptions: ContextPromptOptions | undefined,
): string {
	const systemPrompt = resolveContextPrompt(promptOptions);
	return `${systemPrompt}\n\nContext:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;
}

export async function generateAnswer(
	generator: MultiModelGenerator,
	query: string,
	documents: Document[],
	options: GenerateAnswerOptions = {},
) {
	if (options.contextPrompt) {
		throw new Error(
			'brAInwav RAG: contextPrompt is deprecated. Register the prompt and supply contextPromptId instead.',
		);
	}

	const context = buildContext(documents, options.maxContextLength);
	const prompt = buildPrompt(query, context, {
		id: options.contextPromptId,
		variables: options.contextPromptVariables,
	});

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

export type { GenerateAnswerOptions };
