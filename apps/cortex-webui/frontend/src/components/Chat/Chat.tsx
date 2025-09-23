import { useState } from 'react';
import { useChatStore } from '@/utils/chat-store';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import ModelSelector from './ModelSelector/ModelSelector';
import SettingsModal from './SettingsModal';

const DEFAULT_SESSION_ID = 'default';

const Chat = () => {
	// Model selection
	const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	// Chat store
	const chatStore = useChatStore(DEFAULT_SESSION_ID);
	const { messages, addMessage, clearMessages } = chatStore;
	// Feature toggles
	// const [webSearchEnabled, setWebSearchEnabled] = useState(false); // Unused
	// const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false); // Unused
	// const [codeInterpreterEnabled, setCodeInterpreterEnabled] = useState(false); // Unused
	// Memory stats placeholder
	const memoryStats = undefined;

	// Handlers
	const handleSendMessage = (content: string) => {
		addMessage({ id: `${Date.now()}`, role: 'user', content });
		setStreaming(true);
		// Simulate assistant response (replace with real API call)
		setTimeout(() => {
			addMessage({
				id: `${Date.now()}-a`,
				role: 'assistant',
				content: 'This is a simulated response.',
			});
			setStreaming(false);
		}, 1000);
	};

	const handleCancelStream = () => {
		setStreaming(false);
	};

	// Model list placeholder
	const models = [
		{ id: 'gpt-4', name: 'GPT-4', description: 'OpenAI GPT-4' },
		{ id: 'llama-2', name: 'LLaMA-2', description: 'Meta LLaMA-2' },
	];

	return (
		<div className="flex flex-col h-full">
			{/* Top bar and controls */}
			<div className="p-4 border-b flex justify-between items-center">
				<div className="flex items-center space-x-4">
					<h1 className="text-xl font-bold">Chat</h1>
					<label htmlFor="model-select-0" className="text-sm text-gray-700">
						Model:
					</label>
					<ModelSelector
						models={models}
						selectedModelIds={selectedModelIds}
						onModelChange={setSelectedModelIds}
					/>
					{/* Memory Statistics */}
					{memoryStats && (
						<div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
							{/* ... */}
						</div>
					)}
				</div>
				<div className="flex space-x-2">
					{/* Context Optimization Button */}
					{/* ... */}
					<button
						type="button"
						onClick={() => setIsSettingsOpen(true)}
						className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
						aria-label="Chat settings"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<title>Open settings</title>
							<circle cx="10" cy="10" r="8" />
							<line x1="10" y1="6" x2="10" y2="10" />
							<line x1="10" y1="14" x2="10" y2="14" />
						</svg>
					</button>
					<button
						type="button"
						onClick={() => clearMessages()}
						className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
						aria-label="Clear chat"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<title>Clear chat</title>
							<rect x="4" y="4" width="12" height="12" rx="2" />
							<line x1="8" y1="8" x2="12" y2="12" />
							<line x1="12" y1="8" x2="8" y2="12" />
						</svg>
					</button>
				</div>
			</div>

			{/* Messages list */}
			<div className="flex-1 overflow-y-auto p-4">
				<MessageList messages={messages as ChatMessage[]} streaming={streaming} />
			</div>

			{/* Streaming controls */}
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

			{/* Message input */}
			<div className="p-4 border-t border-white/40 dark:border-gray-700">
				<MessageInput onSendMessage={handleSendMessage} disabled={streaming} />
			</div>

			{/* Settings modal */}
			<SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
		</div>
	);
};

export default Chat;
