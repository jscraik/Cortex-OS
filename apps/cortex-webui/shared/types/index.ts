// Shared TypeScript types for the Cortex WebUI

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  provider: string;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface ToolEvent {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  status?: string;
  createdAt: string;
}

export interface AuthToken {
  token: string;
  expiresAt: string;
}
