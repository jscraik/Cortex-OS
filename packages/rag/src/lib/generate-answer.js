function buildContext(documents, maxLength) {
	const contexts = documents.map(
		(doc, index) => `[Document ${index + 1}]\n${doc.content}\n`,
	);
	let context = contexts.join('\n');
	if (maxLength && context.length > maxLength) {
		context = `${context.substring(0, maxLength)}...`;
	}
	return context;
}
function buildPrompt(query, context, customPrompt) {
	const systemPrompt =
		customPrompt ||
		`You are a helpful AI assistant. Answer the user's question based on the provided context. If the context doesn't contain enough information to answer the question, say so clearly.`;
	return `${systemPrompt}\n\nContext:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;
}
export async function generateAnswer(generator, query, documents, options) {
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
//# sourceMappingURL=generate-answer.js.map
