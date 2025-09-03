// API service for Cortex WebUI

import { API_BASE_URL } from '../constants';
import type { Conversation, FileUpload, Message, Model, User } from '../types';

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
	const url = `${API_BASE_URL}${endpoint}`;

	const defaultOptions: RequestInit = {
		headers: {
			'Content-Type': 'application/json',
		},
	};

	const config = {
		...defaultOptions,
		...options,
		headers: {
			...defaultOptions.headers,
			...options.headers,
		},
	};

	try {
		const response = await fetch(url, config);

		if (!response.ok) {
			throw new Error(`API error: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error(`API call failed for ${url}:`, error);
		throw error;
	}
};

// Auth APIs
export const authAPI = {
	login: async (
		email: string,
		password: string,
	): Promise<{ user: User; token: string }> => {
		return apiCall('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password }),
		});
	},

	register: async (
		name: string,
		email: string,
		password: string,
	): Promise<{ user: User; token: string }> => {
		return apiCall('/auth/register', {
			method: 'POST',
			body: JSON.stringify({ name, email, password }),
		});
	},

	logout: async (): Promise<void> => {
		return apiCall('/auth/logout', {
			method: 'POST',
		});
	},
};

// Conversation APIs
export const conversationAPI = {
	getAll: async (): Promise<Conversation[]> => {
		return apiCall('/conversations');
	},

	getById: async (id: string): Promise<Conversation> => {
		return apiCall(`/conversations/${id}`);
	},

	create: async (title: string): Promise<Conversation> => {
		return apiCall('/conversations', {
			method: 'POST',
			body: JSON.stringify({ title }),
		});
	},

	update: async (
		id: string,
		updates: Partial<Conversation>,
	): Promise<Conversation> => {
		return apiCall(`/conversations/${id}`, {
			method: 'PUT',
			body: JSON.stringify(updates),
		});
	},

	delete: async (id: string): Promise<void> => {
		return apiCall(`/conversations/${id}`, {
			method: 'DELETE',
		});
	},
};

// Message APIs
export const messageAPI = {
	getByConversationId: async (conversationId: string): Promise<Message[]> => {
		return apiCall(`/conversations/${conversationId}/messages`);
	},

	create: async (
		conversationId: string,
		content: string,
		role: 'user' | 'assistant' | 'system' = 'user',
	): Promise<Message> => {
		return apiCall(`/conversations/${conversationId}/messages`, {
			method: 'POST',
			body: JSON.stringify({ content, role }),
		});
	},
};

// Model APIs
export const modelAPI = {
	getAll: async (): Promise<Model[]> => {
		// Use the UI models endpoint from the backend which serves models + defaults
		const data = await apiCall('/models/ui');
		return data?.models ?? [];
	},
};

// File APIs
export const fileAPI = {
	upload: async (file: File): Promise<FileUpload> => {
		const formData = new FormData();
		formData.append('file', file);

		return apiCall('/files/upload', {
			method: 'POST',
			body: formData,
			headers: {}, // Remove Content-Type to let browser set it with boundary
		});
	},

	delete: async (id: string): Promise<void> => {
		return apiCall(`/files/${id}`, {
			method: 'DELETE',
		});
	},
};
