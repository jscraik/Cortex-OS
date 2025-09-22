'use client';

import React, { useState } from 'react';

// import { ChatTypes } from '~/shared/types/chat';
// TODO: Fix import path when shared types are properly set up
type ChatMessage = {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	createdAt: string;
};

import MemoryQuery from '../MemoryQuery';
import WebSearch from '../WebSearch';
import Citations from './Citations';
import CodeExecution from './CodeExecution';

interface MessageProps {
	message: ChatMessage;
	isUser: boolean;
	onEdit?: (content: string) => void;
	onDelete?: () => void;
}

const Message: React.FC<MessageProps> = ({ message, isUser, onEdit, onDelete }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState(message.content);

	const handleEdit = () => {
		setIsEditing(true);
	};

	const handleSave = () => {
		if (onEdit) {
			onEdit(editContent);
		}
		setIsEditing(false);
	};

	const handleCancel = () => {
		setEditContent(message.content);
		setIsEditing(false);
	};

	// Function to render markdown-like content with code blocks and special elements
	const renderContent = (content: string) => {
		// Check if this is a web search result
		if (content.startsWith('[WEB_SEARCH:') && content.endsWith(']')) {
			const query = content.slice(12, -1);
			return <WebSearch query={query} onResults={() => {}} onError={() => {}} />;
		}

		// Check if this is a memory query result
		if (content.startsWith('[MEMORY_QUERY:') && content.endsWith(']')) {
			const query = content.slice(14, -1);
			return <MemoryQuery query={query} onResults={() => {}} onError={() => {}} />;
		}

		// Split content by code blocks
		const parts = content.split(/(```[\s\S]*?```)/g);

		let blockCounter = 0;
		return parts.map((part, index) => {
			if (part.startsWith('```') && part.endsWith('```')) {
				// This is a code block
				const codeContent = part.slice(3, -3).trim();
				const lines = codeContent.split('\n');
				const language = lines[0] && !lines[0].includes(' ') ? lines[0] : 'text';
				const code = language !== 'text' ? lines.slice(1).join('\n') : codeContent;

				// Check if this is an executable code block
				const isExecutable = ['javascript', 'python', 'bash', 'shell'].includes(
					language.toLowerCase(),
				);

				blockCounter += 1;
				const key = `code-${blockCounter}-${language}-${code.length}`;
				return (
					<div key={key} className="my-2">
						{isExecutable ? (
							<CodeExecution
								code={code}
								language={language}
								onResult={() => {}}
								onError={() => {}}
							/>
						) : (
							<div className="rounded border">
								<div className="flex justify-between items-center bg-gray-800 text-gray-200 text-xs px-2 py-1">
									<span>{language}</span>
									<button
										type="button"
										onClick={async () => {
											try {
												await navigator.clipboard.writeText(code);
											} catch {
												// As a last resort, attempt to set the selection; if not permitted, ignore.
												const ta = document.createElement('textarea');
												ta.value = code;
												ta.setAttribute('readonly', '');
												ta.style.position = 'fixed';
												ta.style.opacity = '0';
												ta.style.pointerEvents = 'none';
												document.body.appendChild(ta);
												ta.focus();
												ta.select();
												document.body.removeChild(ta);
											}
										}}
										className="hover:text-white"
										aria-label="Copy code"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<title>Copy code</title>
											<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
											<path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
										</svg>
									</button>
								</div>
								<pre className="p-2 bg-gray-50 overflow-x-auto text-sm">
									<code>{code}</code>
								</pre>
							</div>
						)}
					</div>
				);
			} else {
				// This is regular text, convert line breaks to <br>
				return (
					<span key={`txt-${index}-${part.length}`}>
						{part.split('\n').map((line, lineIndex, arr) => (
							<React.Fragment key={`ln-${lineIndex}-${line.length}`}>
								{line}
								{lineIndex < arr.length - 1 && <br />}
							</React.Fragment>
						))}
					</span>
				);
			}
		});
	};

	// Extract citations from message metadata if available
	const citations = message.citations || [];

	return (
		<div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
			<div className="max-w-[80%]">
				<div className="text-xs text-gray-500 flex justify-between">
					<span>{isUser ? 'You' : message.model || 'Assistant'}</span>
					{message.timestamp && (
						<span>
							{new Date(message.timestamp).toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</span>
					)}
				</div>
				{isEditing ? (
					<div className="rounded px-2 py-1 bg-gray-100">
						<textarea
							value={editContent}
							onChange={(e) => setEditContent(e.target.value)}
							className="w-full p-2 border rounded"
							rows={3}
						/>
						<div className="flex justify-end space-x-2 mt-2">
							<button
								type="button"
								onClick={handleCancel}
								className="px-3 py-1 text-sm border rounded"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSave}
								className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
							>
								Save
							</button>
						</div>
					</div>
				) : (
					<div
						className={`rounded px-2 py-1 whitespace-pre-wrap ${
							isUser ? 'bg-blue-100' : 'bg-gray-100'
						}`}
					>
						{renderContent(message.content)}
						{citations.length > 0 && <Citations citations={citations} />}
						{!isUser && onEdit && (
							<div className="flex justify-end mt-1 space-x-2">
								<button
									type="button"
									onClick={handleEdit}
									className="text-xs text-gray-500 hover:text-gray-700"
								>
									Edit
								</button>
								{onDelete && (
									<button
										type="button"
										onClick={onDelete}
										className="text-xs text-red-500 hover:text-red-700"
									>
										Delete
									</button>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default Message;
