'use client';

import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

// import type { ChatMessage } from '../../../../shared/types/chat';
// TODO: Fix import path when shared types are properly set up
type ChatMessage = {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	createdAt: string;
};

import Message from './Message';
import MessageBranch from './MessageBranch';

interface MessagesProps {
	messages: ChatMessage[];
	streaming: boolean;
	onEditMessage?: (messageId: string, content: string) => void;
	onDeleteMessage?: (messageId: string) => void;
}

const Messages: React.FC<MessagesProps> = ({
	messages,
	streaming,
	onEditMessage,
	onDeleteMessage,
}) => {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	// Group messages by branches for branching visualization
	const groupMessagesByBranch = (messages: ChatMessage[]) => {
		// For now, we'll create a simple branching structure
		// In a real implementation, this would be based on message.parentId relationships

		// Create a simple branch structure for demonstration
		const branches: { [key: string]: ChatMessage[] } = {
			main: [],
		};

		// Separate user and assistant messages
		const userMessages: ChatMessage[] = [];
		const assistantMessages: ChatMessage[] = [];

		messages.forEach((message) => {
			if (message.role === 'user') {
				userMessages.push(message);
			} else {
				assistantMessages.push(message);
			}
		});

		// For demonstration, we'll create branches when there are multiple assistant responses
		if (assistantMessages.length > 1) {
			// Put first user message and first assistant message in main branch
			if (userMessages.length > 0) {
				branches.main.push(userMessages[0]);
			}
			branches.main.push(assistantMessages[0]);

			// Create additional branches for remaining assistant messages
			assistantMessages.slice(1).forEach((message, index) => {
				const branchId = `branch-${index + 1}`;
				branches[branchId] = [message];
			});
		} else {
			// Simple linear conversation
			branches.main = messages;
		}

		return branches;
	};

	const messageBranches = groupMessagesByBranch(messages);

	const branchKeys = Object.keys(messageBranches);

	return (
		<div className="flex-1 overflow-y-auto p-4">
			<div className="space-y-4">
				{branchKeys.length > 1 ? (
					// Show branching view
					<div className="space-y-6">
						{branchKeys.map((branchId, index) => (
							<MessageBranch
								key={branchId}
								messages={messageBranches[branchId]}
								branchId={branchId}
								isActive={index === 0} // First branch is active by default
								onEditMessage={onEditMessage}
								onDeleteMessage={onDeleteMessage}
							/>
						))}
					</div>
				) : (
					// Show linear conversation
					messageBranches.main.map((message) => (
						<Message
							key={message.id}
							message={message}
							isUser={message.role === 'user'}
							onEdit={
								onEditMessage
									? (content) => onEditMessage(message.id, content)
									: undefined
							}
							onDelete={
								onDeleteMessage ? () => onDeleteMessage(message.id) : undefined
							}
						/>
					))
				)}
				{streaming && (
					<div className="flex justify-start">
						<div className="max-w-[80%]">
							<div className="text-xs text-gray-500">Assistant</div>
							<div className="bg-gray-100 rounded px-2 py-1">
								<span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full mr-1"></span>
								<span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full mr-1 delay-75"></span>
								<span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full delay-150"></span>
							</div>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>
		</div>
	);
};

export default Messages;
