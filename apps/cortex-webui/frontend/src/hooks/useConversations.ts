// Hook for managing conversations

import { useCallback, useEffect, useState } from 'react';
import { conversationAPI, messageAPI } from '../services/api';
import type { Conversation, Message } from '../types';

interface UseConversationsReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  createConversation: (title: string) => Promise<Conversation | null>;
  selectConversation: (id: string) => Promise<void>;
  updateConversation: (
    id: string,
    updates: Partial<Conversation>,
  ) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
}

const useConversations = (): UseConversationsReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Move function declarations above useEffect hooks to avoid 'used before declaration' errors

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await conversationAPI.getAll();
      setConversations(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await messageAPI.getByConversationId(conversationId);
      setMessages(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation, loadMessages]);

  const createConversation = async (
    title: string,
  ): Promise<Conversation | null> => {
    setLoading(true);
    setError(null);

    try {
      const newConversation = await conversationAPI.create(title);
      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      setMessages([]);
      return newConversation;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      console.error('Error creating conversation:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const local = conversations.find((c) => c.id === id);
      const conversation = local ?? (await conversationAPI.getById(id));
      setActiveConversation(conversation);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to select conversation';
      setError(errorMessage);
      console.error('Error selecting conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateConversation = async (
    id: string,
    updates: Partial<Conversation>,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const updatedConversation = await conversationAPI.update(id, updates);
      setConversations((prev) =>
        prev.map((conv) => (conv.id === id ? updatedConversation : conv)),
      );

      if (activeConversation && activeConversation.id === id) {
        setActiveConversation(updatedConversation);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update conversation';
      setError(errorMessage);
      console.error('Error updating conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await conversationAPI.delete(id);
      setConversations((prev) => prev.filter((conv) => conv.id !== id));

      if (activeConversation && activeConversation.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(errorMessage);
      console.error('Error deleting conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    createConversation,
    selectConversation,
    updateConversation,
    deleteConversation,
    setActiveConversation,
  };
};

export default useConversations;
