import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface MessageInputProps {
	onSendMessage: (content: string) => void;
	disabled: boolean;
	lastUserMessage?: string;
	placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
	onSendMessage,
	disabled,
	lastUserMessage,
	placeholder = 'Type a message...',
}) => {
	const [input, setInput] = useState('');
	const [messageHistory, setMessageHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-resize textarea
	const adjustTextareaHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = 'auto';
			const maxHeight = 200; // Max height in pixels
			textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
		}
	}, []);

	// Adjust height when input changes
	useEffect(() => {
		adjustTextareaHeight();
	}, [adjustTextareaHeight]);

	// Add message to history when sent
	const addToHistory = useCallback((message: string) => {
		setMessageHistory((prev) => {
			const newHistory = [
				message,
				...prev.filter((msg) => msg !== message),
			].slice(0, 10); // Keep last 10
			return newHistory;
		});
		setHistoryIndex(-1);
	}, []);

	const handleSubmit = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (input.trim() && !disabled) {
			const message = input.trim();
			onSendMessage(message);
			addToHistory(message);
			setInput('');
			setHistoryIndex(-1);
		}
	};

	const clearInput = useCallback(() => {
		setInput('');
		setHistoryIndex(-1);
		textareaRef.current?.focus();
	}, []);

	const recallLastMessage = useCallback(() => {
		if (lastUserMessage) {
			setInput(lastUserMessage);
			setHistoryIndex(-1);
			// Move cursor to end
			setTimeout(() => {
				const textarea = textareaRef.current;
				if (textarea) {
					textarea.selectionStart = textarea.selectionEnd =
						textarea.value.length;
				}
			}, 0);
		}
	}, [lastUserMessage]);

	const navigateHistory = useCallback(
		(direction: 'up' | 'down') => {
			if (messageHistory.length === 0) return;

			if (direction === 'up') {
				const newIndex =
					historyIndex < messageHistory.length - 1
						? historyIndex + 1
						: historyIndex;
				setHistoryIndex(newIndex);
				setInput(messageHistory[newIndex] || '');
			} else {
				const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
				setHistoryIndex(newIndex);
				setInput(newIndex >= 0 ? messageHistory[newIndex] : '');
			}
		},
		[messageHistory, historyIndex],
	);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Send message: Enter (but not Shift+Enter)
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
			return;
		}

		// Clear input: Ctrl/Cmd + L
		if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
			e.preventDefault();
			clearInput();
			return;
		}

		// Recall last message: Ctrl/Cmd + R
		if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
			e.preventDefault();
			recallLastMessage();
			return;
		}

		// Navigate message history: Arrow Up/Down (when at start/end of textarea)
		const textarea = e.currentTarget;
		const atStart = textarea.selectionStart === 0;
		const atEnd = textarea.selectionStart === textarea.value.length;
		const isEmpty = textarea.value.trim() === '';

		if (e.key === 'ArrowUp' && (atStart || isEmpty)) {
			e.preventDefault();
			navigateHistory('up');
			return;
		}

		if (e.key === 'ArrowDown' && (atEnd || isEmpty)) {
			e.preventDefault();
			navigateHistory('down');
			return;
		}

		// Escape: Blur textarea
		if (e.key === 'Escape') {
			textarea.blur();
			return;
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
		// Reset history navigation when user types
		if (historyIndex !== -1) {
			setHistoryIndex(-1);
		}
	};

	// Character count
	const charCount = input.length;
	const isNearLimit = charCount > 3000; // Warn when approaching typical token limits

	return (
		<div className="flex flex-col gap-2">
			{/* Character count indicator */}
			{isNearLimit && (
				<div className="text-xs text-amber-600 dark:text-amber-400 self-end">
					{charCount} characters
				</div>
			)}

			<form onSubmit={handleSubmit} className="flex gap-2 items-end">
				<div className="flex-1 relative">
					<textarea
						ref={textareaRef}
						value={input}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						disabled={disabled}
						className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 pr-12 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 min-h-[44px]"
						placeholder={placeholder}
						rows={1}
					/>

					{/* Keyboard shortcut hints (show on focus) */}
					<div className="absolute bottom-1 right-1 text-xs text-gray-400 dark:text-gray-500 pointer-events-none opacity-0 focus-within:opacity-100 transition-opacity">
						⏎ Send • ⇧⏎ New line
					</div>
				</div>

				<button
					type="submit"
					disabled={disabled || !input.trim()}
					className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg px-4 py-2 h-11 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					title="Send message (Enter)"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<line x1="22" y1="2" x2="11" y2="13"></line>
						<polygon points="22,2 15,22 11,13 2,9"></polygon>
					</svg>
				</button>
			</form>

			{/* Keyboard shortcuts help */}
			<div className="text-xs text-gray-500 dark:text-gray-400 space-x-4">
				<span>
					<kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
						Ctrl+L
					</kbd>{' '}
					Clear
				</span>
				<span>
					<kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
						Ctrl+R
					</kbd>{' '}
					Recall last
				</span>
				<span>
					<kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
						↑↓
					</kbd>{' '}
					History
				</span>
				<span>
					<kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
						Esc
					</kbd>{' '}
					Unfocus
				</span>
			</div>
		</div>
	);
};

export default MessageInput;
