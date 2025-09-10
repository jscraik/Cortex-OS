'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
// Note: UI message shape may include extra fields like timestamp/model for display
// compared to shared backend types.
import { apiFetch } from '../../../utils/api-client';
import { useChatStore } from '../../../utils/chat-store';
import { generateId } from '../../../utils/id';
import notificationStore from '../../utils/notification-store';
import MessageInput from './MessageInput/MessageInput';
import Messages from './Messages/Messages';
import ModelSelector from './ModelSelector/ModelSelector';
import SettingsModal from './SettingsModal';

interface ChatProps {
	sessionId?: string;
}

const Chat: React.FC<ChatProps> = ({ sessionId = 'default-session' }) => {
	const [models, setModels] = useState<{ id: string; name: string }[]>([]);
	const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [files, setFiles] = useState<File[]>([]);
	const [webSearchEnabled, setWebSearchEnabled] = useState(false);
	const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false);
	const [codeInterpreterEnabled, setCodeInterpreterEnabled] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	type ChatSettings = {
		temperature: number;
		maxTokens: number;
		topP: number;
		webSearch: boolean;
		codeExecution: boolean;
		memoryQuery: boolean;
	};

	const [chatSettings, setChatSettings] = useState<ChatSettings>({
		temperature: 0.7,
		maxTokens: 1024,
		topP: 0.9,
		webSearch: false,
		codeExecution: false,
		memoryQuery: false,
	});

	const {
		messages,
		addMessage,
		updateMessage,
		deleteMessage,
		editMessage,
		clearMessages,
	} = useChatStore(sessionId);

	const abortControllerRef = useRef<AbortController | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	// Load models from API
	useEffect(() => {
		const fetchModels = async () => {
			try {
				const data = await apiFetch<{
					models: { id: string; label: string }[];
					default?: string;
				}>('/api/models/ui');

				const mapped = (data.models ?? []).map((m) => ({
					id: m.id,
					name: m.label,
				}));
				setModels(mapped);
				if (mapped.length > 0) {
					const initial =
						data.default && mapped.find((m) => m.id === data.default)
							? data.default
							: mapped[0].id;
					setSelectedModelIds([initial]);
				}
			} catch (error: unknown) {
				if (process.env.NODE_ENV !== 'production') {
					// eslint-disable-next-line no-console
					console.error('Failed to fetch models:', error);
				}
				notificationStore.addNotification({
					type: 'error',
					message: 'Failed to load models',
				});
				// Fallback to a small built-in list so UI remains usable
				const fallback = [
					{ id: 'gpt-4', name: 'GPT-4' },
					{ id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
				];
				setModels(fallback);
				setSelectedModelIds(['gpt-4']);
			}
		};

		fetchModels();
	}, []);

	const handleSendMessage = async (content: string) => {
		if (!content.trim() || streaming) return;

		// Add user message
		const userMessage = {
			id: generateId(),
			role: 'user',
			content,
			timestamp: Date.now(),
			model: selectedModelIds[0],
		};

		addMessage(userMessage);

		// Add temporary assistant message
		const assistantMessageId = generateId();
		const assistantMessage = {
			id: assistantMessageId,
			role: 'assistant',
			content: '',
			timestamp: Date.now(),
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
				{ withCredentials: false },
			);
			eventSourceRef.current = es;

			let accumulated = '';
			es.onmessage = (evt) => {
				try {
					const payload = JSON.parse(evt.data || '{}');
					if (payload.type === 'token' && typeof payload.data === 'string') {
						accumulated += payload.data;
						updateMessage(assistantMessageId, { content: accumulated });
					} else if (payload.type === 'done') {
						// Finalize
						setStreaming(false);
						setFiles([]);
						es.close();
						eventSourceRef.current = null;
					}
				} catch (e) {
					// Ignore malformed chunks, but log in dev
					if (process.env.NODE_ENV !== 'production') {
						console.error('Bad SSE message', e);
					}
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
				notificationStore.addNotification({
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
				if (process.env.NODE_ENV !== 'production') {
					// eslint-disable-next-line no-console
					console.log('Stream cancelled');
				}
			} else {
				if (process.env.NODE_ENV !== 'production') {
					// eslint-disable-next-line no-console
					console.error('Error streaming response:', error);
				}
				updateMessage(assistantMessageId, {
					content: 'Sorry, I encountered an error processing your request.',
				});
				notificationStore.addNotification({
					type: 'error',
					message: 'Failed to get response from AI model',
				});
			}
			setStreaming(false);
		}
	};

	const handleEditMessage = (messageId: string, content: string) => {
		editMessage(messageId, content);
	};

	const handleDeleteMessage = (messageId: string) => {
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

	const handleModelChange = (modelIds: string[]) => {
		setSelectedModelIds(modelIds);
	};

	const handleSaveSettings = (settings: ChatSettings) => {
		setChatSettings(settings);
		notificationStore.addNotification({
			type: 'success',
			message: 'Chat settings saved successfully',
		});
	};

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
				</div>
				<div className="flex space-x-2">
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
						onClick={clearMessages}
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
				messages={messages}
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
				onSendMessage={handleSendMessage}
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
			/>

			<SettingsModal
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
				onSave={handleSaveSettings}
				initialSettings={chatSettings}
			/>
		</div>
	);
};

export default Chat;
