import { getConstitution } from '../tools/constitution.js';
import { getLearningContextText } from './storage.js';

// API Clients - Use 'any' to support dynamic import
let genAI = null;
let openaiClient = null;
// OpenRouter Constants
const openrouterBaseUrl = 'https://openrouter.ai/api/v1';
const defaultHybridBaseUrl = 'http://127.0.0.1:8081';
let hybridCooldownUntil = 0;
// Initialize all configured LLM clients
export async function initializeLLMs() {
	await ensureGemini();
	await ensureOpenAI();
}
async function ensureGemini() {
	if (!genAI && process.env.GEMINI_API_KEY) {
		const { GoogleGenerativeAI } = await import('@google/generative-ai');
		genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
		console.log('Gemini API client initialized dynamically');
	}
}
async function ensureOpenAI() {
	if (!openaiClient && process.env.OPENAI_API_KEY) {
		const { OpenAI } = await import('openai');
		openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
		console.log('OpenAI API client initialized dynamically');
	}
}
function resolveHybridConfig() {
	if (process.env.VIBE_CHECK_DISABLE_HYBRID === 'true') {
		return null;
	}
	const baseUrl =
		process.env.VIBE_CHECK_MODEL_GATEWAY_URL ||
		process.env.MODEL_GATEWAY_URL ||
		process.env.CORTEX_MODEL_GATEWAY_URL ||
		(process.env.VIBE_CHECK_ENABLE_HYBRID === 'false' ? '' : defaultHybridBaseUrl);
	if (!baseUrl) {
		return null;
	}
	const path = process.env.VIBE_CHECK_MODEL_GATEWAY_PATH || '/chat';
	const timeout = Number(
		process.env.VIBE_CHECK_MODEL_GATEWAY_TIMEOUT ?? process.env.MODEL_GATEWAY_TIMEOUT ?? 5000,
	);
	const apiKey = process.env.VIBE_CHECK_MODEL_GATEWAY_API_KEY || process.env.MODEL_GATEWAY_API_KEY;
	const model =
		process.env.VIBE_CHECK_MODEL_GATEWAY_MODEL || process.env.CORTEX_MODEL_GATEWAY_MODEL;
	return { baseUrl, path, timeout, apiKey, model };
}
async function maybeCallHybridGateway(params) {
	const config = resolveHybridConfig();
	if (!config) {
		return null;
	}
	const now = Date.now();
	if (hybridCooldownUntil && now < hybridCooldownUntil) {
		return null;
	}
	try {
		const { default: axios } = await import('axios');
		const endpoint = new URL(config.path, config.baseUrl).toString();
		const headers = { 'Content-Type': 'application/json' };
		if (config.apiKey) {
			headers['Authorization'] = `Bearer ${config.apiKey}`;
		}
		const payload = {
			model: params.model ?? config.model ?? undefined,
			msgs: [
				{ role: 'system', content: params.systemPrompt },
				{ role: 'user', content: params.contextSection },
			],
		};
		const response = await axios.post(endpoint, payload, {
			headers,
			timeout: config.timeout,
		});
		const text = response?.data?.content;
		if (typeof text === 'string' && text.trim().length > 0) {
			hybridCooldownUntil = 0;
			return text;
		}
		return null;
	} catch (error) {
		hybridCooldownUntil = Date.now() + 60000;
		const message = error instanceof Error ? error.message : String(error);
		console.error('brAInwav-vibe-check: hybrid gateway error', message);
		return null;
	}
}
// Main dispatcher function to generate responses from the selected LLM provider
export async function generateResponse(input) {
	const provider = input.modelOverride?.provider || process.env.DEFAULT_LLM_PROVIDER || 'gemini';
	const model = input.modelOverride?.model || process.env.DEFAULT_MODEL;
	// The system prompt remains the same as it's core to the vibe-check philosophy
	const systemPrompt = `You are a meta-mentor. You're an experienced feedback provider that specializes in understanding intent, dysfunctional patterns in AI agents, and in responding in ways that further the goal. You need to carefully reason and process the information provided, to determine your output.\n\nYour tone needs to always be a mix of these traits based on the context of which pushes the message in the most appropriate affect: Gentle & Validating, Unafraid to push many questions but humble enough to step back, Sharp about problems and eager to help about problem-solving & giving tips and/or advice, stern and straightforward when spotting patterns & the agent being stuck in something that could derail things.\n\nHere's what you need to think about (Do not output the full thought process, only what is explicitly requested):\n1. What's going on here? What's the nature of the problem is the agent tackling? What's the approach, situation and goal? Is there any prior context that clarifies context further? \n2. What does the agent need to hear right now: Are there any clear patterns, loops, or unspoken assumptions being missed here? Or is the agent doing fine - in which case should I interrupt it or provide soft encouragement and a few questions? What is the best response I can give right now?\n3. In case the issue is technical - I need to provide guidance and help. In case I spot something that's clearly not accounted for/ assumed/ looping/ or otherwise could be out of alignment with the user or agent stated goals - I need to point out what I see gently and ask questions on if the agent agrees. If I don't see/ can't interpret an explicit issue - what intervention would provide valuable feedback here - questions, guidance, validation, or giving a soft go-ahead with reminders of best practices?\n4. In case the plan looks to be accurate - based on the context, can I remind the agent of how to continue, what not to forget, or should I soften and step back for the agent to continue its work? What's the most helpful thing I can do right now?`;
	let learningContext = '';
	if (process.env.USE_LEARNING_HISTORY === 'true') {
		learningContext = getLearningContextText();
	}
	const rules = input.sessionId ? getConstitution(input.sessionId) : [];
	const constitutionBlock = rules.length
		? `\nConstitution:\n${rules.map((r) => `- ${r}`).join('\n')}`
		: '';
	const contextSection = `CONTEXT:\nHistory Context: ${input.historySummary || 'None'}\n${learningContext ? `Learning Context:\n${learningContext}` : ''}\nGoal: ${input.goal}\nPlan: ${input.plan}\nProgress: ${input.progress || 'None'}\nUncertainties: ${input.uncertainties?.join(', ') || 'None'}\nTask Context: ${input.taskContext || 'None'}\nUser Prompt: ${input.userPrompt || 'None'}${constitutionBlock}`;
	const fullPrompt = `${systemPrompt}\n\n${contextSection}`;
	const hybridResponse = await maybeCallHybridGateway({
		systemPrompt,
		contextSection,
		model,
	});
	if (hybridResponse) {
		return {
			questions: hybridResponse,
		};
	}
	let responseText = '';
	if (provider === 'gemini') {
		await ensureGemini();
		if (!genAI) throw new Error('Gemini API key missing.');
		const geminiModel = model || 'gemini-2.5-pro';
		const fallbackModel = 'gemini-2.5-flash';
		try {
			console.log(`Attempting to use Gemini model: ${geminiModel}`);
			// console.error('Full Prompt:', fullPrompt); // Keep this commented out for now
			const modelInstance = genAI.getGenerativeModel({ model: geminiModel });
			const result = await modelInstance.generateContent(fullPrompt);
			responseText = result.response.text();
		} catch (error) {
			console.error(`Gemini model ${geminiModel} failed. Trying fallback ${fallbackModel}.`, error);
			// console.error('Full Prompt:', fullPrompt); // Keep this commented out for now
			const fallbackModelInstance = genAI.getGenerativeModel({ model: fallbackModel });
			const result = await fallbackModelInstance.generateContent(fullPrompt);
			responseText = result.response.text();
		}
	} else if (provider === 'openai') {
		await ensureOpenAI();
		if (!openaiClient) throw new Error('OpenAI API key missing.');
		const openaiModel = model || 'o4-mini';
		console.log(`Using OpenAI model: ${openaiModel}`);
		const response = await openaiClient.chat.completions.create({
			model: openaiModel,
			messages: [{ role: 'system', content: fullPrompt }],
		});
		responseText = response.choices[0].message.content || '';
	} else if (provider === 'openrouter') {
		if (!process.env.OPENROUTER_API_KEY) throw new Error('OpenRouter API key missing.');
		if (!model)
			throw new Error('OpenRouter provider requires a model to be specified in the tool call.');
		console.log(`Using OpenRouter model: ${model}`);
		const { default: axios } = await import('axios');
		const response = await axios.post(
			`${openrouterBaseUrl}/chat/completions`,
			{
				model: model,
				messages: [{ role: 'system', content: fullPrompt }],
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
					'HTTP-Referer': 'http://localhost',
					'X-Title': 'Vibe Check MCP Server',
				},
			},
		);
		responseText = response.data.choices[0].message.content || '';
	} else {
		throw new Error(`Invalid provider specified: ${provider}`);
	}
	return {
		questions: responseText,
	};
}
// The exported function is now a wrapper around the dispatcher
export async function getMetacognitiveQuestions(input) {
	try {
		return await generateResponse(input);
	} catch (error) {
		console.error('Error getting metacognitive questions:', error);
		// Fallback questions
		return {
			questions: `\nI can see you're thinking through your approach, which shows thoughtfulness:\n\n1. Does this plan directly address what the user requested, or might it be solving a different problem?\n2. Is there a simpler approach that would meet the user's needs?\n3. What unstated assumptions might be limiting the thinking here?\n4. How does this align with the user's original intent?\n`,
		};
	}
}
// Testing helpers
export const __testing = {
	setGenAI(client) {
		genAI = client;
	},
	setOpenAIClient(client) {
		openaiClient = client;
	},
	getGenAI() {
		return genAI;
	},
	getOpenAIClient() {
		return openaiClient;
	},
};
