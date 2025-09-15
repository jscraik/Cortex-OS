"use client";

import React, { useEffect, useRef, useState } from "react";
// Note: UI message shape may include extra fields like timestamp/model for display
// compared to shared backend types.
import { apiFetch } from '../../utils/api-client';
import type {
	ChatMessage,
	ChatMessageRole,
	UseChatStoreApi,
} from '../../utils/chat-store';
import { useChatStore } from '../../utils/chat-store';
import { generateId } from '../../utils/id';
import { addNotification } from '../../utils/notification-store';
import MessageInput from './MessageInput/MessageInput';
import Messages from './Messages/Messages';
import ModelSelector from './ModelSelector/ModelSelector';
import SettingsModal from './SettingsModal';

interface ChatProps {
	sessionId?: string;
}

const Chat: React.FC<ChatProps> = ({ sessionId = 'default-session' }) => {
	// Helper types
	type SsePayload =
		| { type: 'token'; data: string }
		| { type: 'done' }
		| { type: string };
	type ChatMessageWithCreatedAt = ChatMessage & { createdAt: string };

	// Placeholder models array
	const models: { id: string; name: string }[] = [];

	// Hooks and state
	const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [files, setFiles] = useState<File[]>([]);
	const [webSearchEnabled, setWebSearchEnabled] = useState(false);
	const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false);
	const [codeInterpreterEnabled, setCodeInterpreterEnabled] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [memoryStats] = useState<{
		messageCount: number;
		tokenCount: number;
		estimatedMemoryKB: number;
		utilizationPercent: number;
	} | null>(null);

	const chat: UseChatStoreApi = useChatStore(sessionId);
	const {
		messages,
		addMessage,
		updateMessage,
		editMessage,
		deleteMessage,
		clearMessages,
	} = chat;
	const abortControllerRef = useRef<AbortController | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	// Ensure all messages have createdAt
	const safeMessages: ChatMessageWithCreatedAt[] = messages.map((m: ChatMessage) => ({
		...m,
		createdAt: typeof m.createdAt === 'string' ? m.createdAt : (m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString()),
	}));

	// Function declarations
	const handleEditMessage = (messageId: string, content: string): void => {
		editMessage(messageId, content);
	};

	const handleDeleteMessage = (messageId: string): void => {
		deleteMessage(messageId);
	};

	const handleCancelStream = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
		setStreaming(false);
	};

	const handleSendMessage = async (content: string): Promise<void> => {
		if (!content.trim() || streaming) return;
		const idGen = generateId as unknown as () => string;
		const userMessage: ChatMessage = {
			id: idGen(),
			role: 'user' as ChatMessageRole,
			content,
			timestamp: Date.now(),
			createdAt: new Date().toISOString(),
			model: selectedModelIds[0],
		};
		addMessage(userMessage);
		const assistantMessageId: string = idGen();
		const assistantMessage: ChatMessage = {
			id: assistantMessageId,
			role: 'assistant' as ChatMessageRole,
			content: '',
			timestamp: Date.now(),
			createdAt: new Date().toISOString(),
			model: selectedModelIds[0],
		};
		addMessage(assistantMessage);
		setStreaming(true);
		try {
			abortControllerRef.current = new AbortController();
			await fetch(`/api/chat/${encodeURIComponent(sessionId)}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content, modelId: selectedModelIds[0] }),
				signal: abortControllerRef.current.signal,
			});
			const es = new EventSource(
				`/api/chat/${encodeURIComponent(sessionId)}/stream`,
				{ withCredentials: false },
			);
			eventSourceRef.current = es;
			let accumulated = '';
			const isToken = (p: SsePayload): p is { type: 'token'; data: string } => p.type === 'token';
			es.onmessage = (evt: MessageEvent) => {
				try {
					const raw = typeof evt.data === 'string' ? evt.data : String(evt.data ?? '{}');
					const payload = JSON.parse(raw) as SsePayload;
					if (isToken(payload)) {
						accumulated += payload.data;
						updateMessage(assistantMessageId, { content: accumulated });
					} else if (payload.type === 'done') {
						setStreaming(false);
						setFiles([]);
						es.close();
						eventSourceRef.current = null;
					}
				} catch {}
			};
			es.onerror = () => {
				if (eventSourceRef.current) {
					eventSourceRef.current.close();
					eventSourceRef.current = null;
				}
				setStreaming(false);
				updateMessage(assistantMessageId, {
					content: 'Sorry, I encountered an error processing your request.',
				});
				addNotification({
					type: 'error',
					message: 'Failed to get response from AI model',
				});
			};
		} catch (error: unknown) {
			const isAbort = typeof error === 'object' && error !== null && 'name' in (error as Record<string, unknown>) && (error as Record<string, unknown>).name === 'AbortError';
			if (!isAbort) {
				updateMessage(assistantMessageId, {
					content: 'Sorry, I encountered an error processing your request.',
				});
				addNotification({
					type: 'error',
					message: 'Failed to get response from AI model',
				});
			}
			setStreaming(false);
		}
	};
	const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [files, setFiles] = useState<File[]>([]);
	const [webSearchEnabled, setWebSearchEnabled] = useState(false);
	const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false);
	const [codeInterpreterEnabled, setCodeInterpreterEnabled] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [memoryStats] = useState<{
		messageCount: number;
		tokenCount: number;
		estimatedMemoryKB: number;
		utilizationPercent: number;
	} | null>(null);
	// Chat settings are now managed inside SettingsModal tabs; local state deprecated

	const chat: UseChatStoreApi = useChatStore(sessionId);
	const {
		messages,
		addMessage,
		updateMessage,
		editMessage,
		deleteMessage,
		clearMessages,
	} = chat;
	const abortControllerRef = useRef<AbortController | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);
	// Ensure all messages have createdAt
	const safeMessages: ChatMessage[] = messages.map((m: ChatMessage) => ({
		...m,
		createdAt: m.createdAt ?? (m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString()),
	}));

		// Function declarations

		// ...other function declarations remain above return...

		return (
			<div className="flex flex-col h-full">
				<div className="p-4 border-b flex justify-between items-center">
					{/* ...existing code... */}
				</div>
				<Messages
					messages={safeMessages}
					streaming={streaming}
					onEditMessage={handleEditMessage}
					onDeleteMessage={handleDeleteMessage}
				/>
				{streaming && (
					<div className="px-4 py-2 border-t">
						<button
							type="button"
							onClick={handleCancelStream}
							className="text-sm text-red-600 hover:text-red-800"
						>
							Stop generating
						</button>
					</div>
				)}
				<MessageInput
					onSendMessage={(c) => {
						void handleSendMessage(c);
					}}
					disabled={streaming}
					placeholder="Type a message..."
					files={files}
					setFiles={setFiles}
					webSearchEnabled={webSearchEnabled}
					setWebSearchEnabled={setWebSearchEnabled}
					imageGenerationEnabled={imageGenerationEnabled}
					setImageGenerationEnabled={setImageGenerationEnabled}
					codeInterpreterEnabled={codeInterpreterEnabled}
					setCodeInterpreterEnabled={setCodeInterpreterEnabled}
					lastUserMessage={
						safeMessages.filter((m) => m.role === 'user').slice(-1)[0]?.content
					}
				/>
				<SettingsModal
					isOpen={isSettingsOpen}
					onClose={() => setIsSettingsOpen(false)}
				/>
			</div>

	const handleSendMessage = async (content: string): Promise<void> => {
		if (!content.trim() || streaming) return;

		// Add user message
		const idGen = generateId as unknown as () => string;
		const userMessage: ChatMessage = {
			id: idGen(),
			role: 'user' as ChatMessageRole,
			content,
			timestamp: Date.now(),
			createdAt: new Date().toISOString(),
			model: selectedModelIds[0],
		};

		addMessage(userMessage);

		// Add temporary assistant message
		const assistantMessageId: string = idGen();
		const assistantMessage: ChatMessage = {
			id: assistantMessageId,
			role: 'assistant' as ChatMessageRole,
			content: '',
			timestamp: Date.now(),
			createdAt: new Date().toISOString(),
			model: selectedModelIds[0],
		};

		addMessage(assistantMessage);
		setStreaming(true);

		try {
			// Create AbortController for optional non-EventSource flows
			abortControllerRef.current = new AbortController();

			// 1) Tell backend about the user message so SSE has context
			await fetch(`/api/chat/${encodeURIComponent(sessionId)}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content, modelId: selectedModelIds[0] }),
				signal: abortControllerRef.current.signal,
			});

			// 2) Start SSE stream for assistant response
			const es = new EventSource(
				`/api/chat/${encodeURIComponent(sessionId)}/stream`,
				{
					withCredentials: false,
				},
			);
			eventSourceRef.current = es;

			let accumulated = '';
			type SsePayload =
				| { type: 'token'; data: string }
				| { type: 'done' }
				| { type: string };
			const isToken = (p: SsePayload): p is { type: 'token'; data: string } =>
				p.type === 'token';

			es.onmessage = (evt: MessageEvent) => {
				try {
					const raw =
						typeof evt.data === 'string' ? evt.data : String(evt.data ?? '{}');
					const payload = JSON.parse(raw) as SsePayload;
					if (isToken(payload)) {
						accumulated += payload.data;
						updateMessage(assistantMessageId, { content: accumulated });
					} else if (payload.type === 'done') {
						// Finalize
						setStreaming(false);
						setFiles([]);
						es.close();
						eventSourceRef.current = null;
					}
				} catch {
					// Ignore malformed chunks
				}
			};

			es.onerror = () => {
				// Close on error and surface a friendly message
				if (eventSourceRef.current) {
					eventSourceRef.current.close();
					eventSourceRef.current = null;
				}
				setStreaming(false);
				updateMessage(assistantMessageId, {
					content: 'Sorry, I encountered an error processing your request.',
				});
				addNotification({
					type: 'error',
					message: 'Failed to get response from AI model',
				});
			};
		} catch (error: unknown) {
			const isAbort =
				typeof error === 'object' &&
				error !== null &&
				'name' in (error as Record<string, unknown>) &&
				(error as Record<string, unknown>).name === 'AbortError';
			if (isAbort) {
				// Dev-only logging removed for frontend compatibility
			} else {
				// Dev-only logging removed for frontend compatibility
				updateMessage(assistantMessageId, {
					content: 'Sorry, I encountered an error processing your request.',
				});
				addNotification({
					type: 'error',
					message: 'Failed to get response from AI model',
				});
			}
			setStreaming(false);
		}
	};


	const handleModelChange = (modelIds: string[]) => {
		setSelectedModelIds(modelIds);
	};

	// Settings saving handled within SettingsModal; no-op here

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b flex justify-between items-center">
				<div className="flex items-center space-x-4">
					<h1 className="text-xl font-bold">Chat</h1>
					<label htmlFor="model-select-0" className="text-sm text-gray-700">
						Model:
					</label>
					<ModelSelector
						models={models}
						selectedModelIds={selectedModelIds}
						onModelChange={handleModelChange}
						disabled={streaming}
					/>
					{/* Memory Statistics */}
					{memoryStats && (
						<div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
							{memoryStats?.messageCount} messages • {memoryStats?.tokenCount} tokens
							{(memoryStats && memoryStats.utilizationPercent > 70) && (
								<span
									className={`ml-1 ${memoryStats.utilizationPercent > 90 ? 'text-red-500' : 'text-amber-500'}`}
								>
									({memoryStats.utilizationPercent}%)
								</span>
							)}
						</div>
					)}
				</div>
				<div className="flex space-x-2">
					{/* Context Optimization Button */}
					{(memoryStats && memoryStats.utilizationPercent > 60) && (
						<button type="button">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<title>Optimize context</title>
								<path
									fillRule="evenodd"
									d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
									clipRule="evenodd"
								/>
							</svg>
						</button>
					)}
					<button
						type="button"
						onClick={() => setIsSettingsOpen(true)}
						className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
						aria-label="Chat settings"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<title>Settings</title>
							<path
								fillRule="evenodd"
								d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
					<button
						type="button"
						onClick={() => clearMessages()}
						className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
						aria-label="Clear chat"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<title>Clear chat</title>
							<path
								fillRule="evenodd"
								d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
				</div>
			</div>

			<Messages
				messages={safeMessages as ChatMessage[]}
				streaming={streaming}
				onEditMessage={handleEditMessage}
				onDeleteMessage={handleDeleteMessage}
			/>

			{streaming && (
				<div className="px-4 py-2 border-t">
					<button
						type="button"
						onClick={handleCancelStream}
						className="text-sm text-red-600 hover:text-red-800"
					>
						Stop generating
					</button>
				</div>
			)}

			<MessageInput
				onSendMessage={(c) => {
					void handleSendMessage(c);
				}}
				disabled={streaming}
				placeholder="Type a message..."
				files={files}
				setFiles={setFiles}
				webSearchEnabled={webSearchEnabled}
				setWebSearchEnabled={setWebSearchEnabled}
				imageGenerationEnabled={imageGenerationEnabled}
				setImageGenerationEnabled={setImageGenerationEnabled}
				codeInterpreterEnabled={codeInterpreterEnabled}
				setCodeInterpreterEnabled={setCodeInterpreterEnabled}
				lastUserMessage={
					safeMessages.filter((m) => m.role === 'user').slice(-1)[0]?.content
				}
			/>

			<SettingsModal
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
			/>
		</div>
	);
};

export default Chat;
