/**
 * ChatGPT Deep Research Tools
 * 
 * Implements search/fetch pattern required by ChatGPT's deep research feature.
 * Maps to Local Memory backend for document storage and retrieval.
 * 
 * Based on OpenAI's example:
 * https://platform.openai.com/docs/mcp
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Search tool for ChatGPT deep research
 * 
 * Returns list of documents with snippets. ChatGPT will use fetch() to get full content.
 */
export const searchTool: Tool = {
    name: 'search',
    description: `Search for documents and memories using keywords or semantic queries.
This tool searches through stored memories to find semantically relevant matches.
Returns a list of search results with basic information. Use the fetch tool to get
complete document content.`,
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query string. Natural language queries work best for semantic search.',
            },
        },
        required: ['query'],
    },
};

/**
 * Search handler implementation
 */
export async function handleSearch(args: { query: string }): Promise<{ results: Array<{ id: string; title: string; text: string; url?: string }> }> {
    const { query } = args;

    if (!query?.trim()) {
        return { results: [] };
    }

    // TODO: Call Local Memory search endpoint
    // For now, return mock structure matching OpenAI's example
    const response = await fetch(`${process.env.LOCAL_MEMORY_BASE_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            limit: 10,
            includeContent: true
        }),
    });

    const data = await response.json();

    // Transform Local Memory response to ChatGPT search format
    const results = data.memories?.map((memory: any) => ({
        id: memory.id,
        title: memory.tags?.[0] || 'Memory',
        text: memory.text.substring(0, 200) + (memory.text.length > 200 ? '...' : ''),
        url: undefined, // Optional: add URL if memories have external links
    })) || [];

    return { results };
}

/**
 * Fetch tool for ChatGPT deep research
 * 
 * Retrieves complete document content by ID for detailed analysis and citation.
 */
export const fetchTool: Tool = {
    name: 'fetch',
    description: `Retrieve complete document content by ID for detailed analysis and citation.
This tool fetches the full document content from memory storage. Use this after finding
relevant documents with the search tool to get complete information for analysis and
proper citation.`,
    inputSchema: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'Memory/document ID from search results',
            },
        },
        required: ['id'],
    },
};

/**
 * Fetch handler implementation
 */
export async function handleFetch(args: { id: string }): Promise<{ id: string; title: string; text: string; url?: string; metadata?: any }> {
    const { id } = args;

    if (!id) {
        throw new Error('Document ID is required');
    }

    // TODO: Call Local Memory get endpoint
    const response = await fetch(`${process.env.LOCAL_MEMORY_BASE_URL}/memories/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`Memory not found: ${id}`);
    }

    const memory = await response.json();

    // Transform Local Memory response to ChatGPT fetch format
    return {
        id: memory.id,
        title: memory.tags?.[0] || 'Memory',
        text: memory.text,
        url: undefined, // Optional: add URL if available
        metadata: {
            importance: memory.importance,
            tags: memory.tags,
            createdAt: memory.createdAt,
            domain: memory.domain,
        },
    };
}
