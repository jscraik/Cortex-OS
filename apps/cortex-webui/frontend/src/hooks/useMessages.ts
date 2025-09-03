// Hook for managing messages and streaming

import { useCallback, useState } from 'react';
import { Message } from '../types';

interface UseMessagesReturn {
  messages: Message[];
  streaming: boolean;
  error: string | null;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
}

const useMessages = (): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendMessage = async (conversationId: string, content: string) => {
    setError(null);

    try {
      // Add user message immediately
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        conversationId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };

      addMessage(userMessage);

      // Add temporary assistant message for streaming
      const assistantMessage: Message = {
        id: `stream_${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      };

      addMessage(assistantMessage);
      setStreaming(true);

      // In a real implementation, this would connect to a streaming endpoint
      // For now, we'll simulate streaming behavior
      await simulateStreamingResponse(conversationId, content, assistantMessage.id, updateMessage);

      setStreaming(false);
    } catch (err) {
      setStreaming(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Error sending message:', err);
    }
  };

  return {
    messages,
    streaming,
    error,
    sendMessage,
    addMessage,
    updateMessage,
    clearMessages,
  };
};

// Simulate streaming response for demo purposes
const simulateStreamingResponse = async (
  conversationId: string,
  content: string,
  messageId: string,
  updateMessage: (id: string, updates: Partial<Message>) => void,
): Promise<void> => {
  // In a real implementation, this would connect to a WebSocket or SSE endpoint
  // and update the message as tokens arrive

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate streaming response
  const response = `I received your message: "${content}". This is a simulated response from the AI assistant. In a real implementation, this would be a streamed response from an AI model.`;

  // Simulate streaming by updating the message incrementally
  let accumulatedResponse = '';
  for (const char of response) {
    accumulatedResponse += char;
    updateMessage(messageId, { content: accumulatedResponse });
    await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay for each character
  }
};

export default useMessages;
