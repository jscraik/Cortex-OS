/**
 * Context Manager for intelligent conversation handling
 * Provides summarization, context window management, and memory optimization
 */

export interface ConversationSummary {
	summary: string;
	keyPoints: string[];
	messageCount: number;
	tokenEstimate: number;
	timestamp: number;
}

export interface ContextWindow {
	messages: any[];
	tokenCount: number;
	summary?: ConversationSummary;
}

export class ContextManager {
	private readonly maxTokens: number;
	private readonly summaryThreshold: number;
	private readonly maxMessagesBeforeSummary: number;

	constructor(
		maxTokens = 4000,
		summaryThreshold = 3000,
		maxMessagesBeforeSummary = 20,
	) {
		this.maxTokens = maxTokens;
		this.summaryThreshold = summaryThreshold;
		this.maxMessagesBeforeSummary = maxMessagesBeforeSummary;
	}

	/**
	 * Estimate token count for a message
	 * Rough approximation: 1 token ≈ 4 characters for English text
	 */
	estimateTokens(text: string): number {
		return Math.ceil(text.length / 4);
	}

	/**
	 * Calculate total token count for messages
	 */
	calculateTokenCount(messages: any[]): number {
		return messages.reduce((total, message) => {
			return total + this.estimateTokens(message.content || '');
		}, 0);
	}

	/**
	 * Check if conversation needs summarization
	 */
	needsSummarization(messages: any[]): boolean {
		const tokenCount = this.calculateTokenCount(messages);
		return (
			tokenCount > this.summaryThreshold ||
			messages.length > this.maxMessagesBeforeSummary
		);
	}

	/**
	 * Create a conversation summary
	 */
	async createSummary(messages: any[]): Promise<ConversationSummary> {
		// Extract key information from conversation
		const userMessages = messages.filter((m) => m.role === 'user');
		const assistantMessages = messages.filter((m) => m.role === 'assistant');

		// Simple extractive summary - in a real implementation, this could use an AI model
		const keyTopics = this.extractKeyTopics(messages);
		const summary = this.generateSummary(
			userMessages,
			assistantMessages,
			keyTopics,
		);

		return {
			summary,
			keyPoints: keyTopics,
			messageCount: messages.length,
			tokenEstimate: this.calculateTokenCount(messages),
			timestamp: Date.now(),
		};
	}

	/**
	 * Extract key topics from conversation
	 */
	private extractKeyTopics(messages: any[]): string[] {
		const allText = messages
			.map((m) => m.content || '')
			.join(' ')
			.toLowerCase();

		// Simple keyword extraction - could be enhanced with NLP
		const commonWords = new Set([
			'the',
			'is',
			'at',
			'which',
			'on',
			'and',
			'a',
			'to',
			'are',
			'as',
			'was',
			'were',
			'been',
			'be',
			'have',
			'has',
			'had',
			'do',
			'does',
			'did',
			'will',
			'would',
			'should',
			'could',
			'can',
			'may',
			'might',
			'must',
			'shall',
			'this',
			'that',
			'these',
			'those',
			'i',
			'you',
			'he',
			'she',
			'it',
			'we',
			'they',
			'me',
			'him',
			'her',
			'us',
			'them',
			'my',
			'your',
			'his',
			'its',
			'our',
			'their',
			'in',
			'of',
			'for',
			'with',
			'by',
			'from',
			'up',
			'about',
			'into',
			'through',
			'during',
			'before',
			'after',
			'above',
			'below',
			'between',
			'among',
			'an',
		]);

		const words = allText
			.replace(/[^\w\s]/g, ' ')
			.split(/\s+/)
			.filter((word) => word.length > 3 && !commonWords.has(word));

		// Count word frequency
		const wordCount = words.reduce(
			(acc, word) => {
				acc[word] = (acc[word] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		// Return top keywords
		return Object.entries(wordCount)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([word]) => word);
	}

	/**
	 * Generate conversation summary
	 */
	private generateSummary(
		userMessages: any[],
		assistantMessages: any[],
		keyTopics: string[],
	): string {
		const userQuestions = userMessages
			.slice(0, 3)
			.map(
				(m) =>
					m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : ''),
			);

		return (
			`Conversation covered: ${keyTopics.join(', ')}. ` +
			`User asked about: ${userQuestions.join('; ')}. ` +
			`${userMessages.length} user messages, ${assistantMessages.length} assistant responses.`
		);
	}

	/**
	 * Optimize context window by summarizing older messages
	 */
	async optimizeContext(messages: any[]): Promise<ContextWindow> {
		if (!this.needsSummarization(messages)) {
			return {
				messages,
				tokenCount: this.calculateTokenCount(messages),
			};
		}

		// Keep recent messages and summarize older ones
		const recentMessageCount = Math.floor(this.maxMessagesBeforeSummary * 0.4);
		const recentMessages = messages.slice(-recentMessageCount);
		const olderMessages = messages.slice(0, -recentMessageCount);

		const optimizedMessages = [...recentMessages];
		let summary: ConversationSummary | undefined;

		if (olderMessages.length > 0) {
			summary = await this.createSummary(olderMessages);

			// Add summary as a system message at the beginning
			optimizedMessages.unshift({
				id: `summary-${Date.now()}`,
				role: 'system',
				content: `Previous conversation summary: ${summary.summary}`,
				timestamp: Date.now(),
				model: 'context-manager',
			});
		}

		return {
			messages: optimizedMessages,
			tokenCount: this.calculateTokenCount(optimizedMessages),
			summary,
		};
	}

	/**
	 * Smart context pruning - keep important messages
	 */
	pruneContext(messages: any[], targetTokenCount?: number): any[] {
		const target = targetTokenCount || this.maxTokens;
		const currentTokens = this.calculateTokenCount(messages);

		if (currentTokens <= target) {
			return messages;
		}

		// Always keep the last few messages
		const mustKeepCount = 4;
		const mustKeep = messages.slice(-mustKeepCount);
		const canPrune = messages.slice(0, -mustKeepCount);

		// Score messages by importance (length, keywords, question marks, etc.)
		const scoredMessages = canPrune.map((message, index) => ({
			...message,
			originalIndex: index,
			score: this.scoreMessageImportance(message),
		}));

		// Sort by score (keep higher scores)
		scoredMessages.sort((a, b) => b.score - a.score);

		// Add messages back until we hit token limit
		const result = [];
		let tokens = this.calculateTokenCount(mustKeep);

		for (const message of scoredMessages) {
			const messageTokens = this.estimateTokens(message.content || '');
			if (
				tokens + messageTokens <=
				target - this.calculateTokenCount(mustKeep)
			) {
				result.push(message);
				tokens += messageTokens;
			}
		}

		// Sort back to original order and add must-keep messages
		result.sort((a, b) => a.originalIndex - b.originalIndex);
		return [...result, ...mustKeep];
	}

	/**
	 * Score message importance for context pruning
	 */
	private scoreMessageImportance(message: any): number {
		const content = message.content || '';
		let score = 0;

		// Longer messages might be more important
		score += Math.min(content.length / 100, 5);

		// Questions are often important
		score += (content.match(/\?/g) || []).length * 2;

		// Code blocks are important
		score += (content.match(/```/g) || []).length;

		// User messages are often more important than assistant messages
		if (message.role === 'user') {
			score += 3;
		}

		// Recent messages are more important
		const age = Date.now() - (message.timestamp || 0);
		const ageHours = age / (1000 * 60 * 60);
		score += Math.max(0, 10 - ageHours);

		return score;
	}

	/**
	 * Get memory usage statistics
	 */
	getMemoryStats(messages: any[]): {
		messageCount: number;
		tokenCount: number;
		estimatedMemoryKB: number;
		utilizationPercent: number;
	} {
		const tokenCount = this.calculateTokenCount(messages);
		const estimatedMemoryKB = Math.round((tokenCount * 4) / 1024); // Rough estimate
		const utilizationPercent = Math.round((tokenCount / this.maxTokens) * 100);

		return {
			messageCount: messages.length,
			tokenCount,
			estimatedMemoryKB,
			utilizationPercent,
		};
	}
}

// Default export for easy usage
export const contextManager = new ContextManager();
