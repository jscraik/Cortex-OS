'use client';

import type React from 'react';
import type { ChatMessage } from '../../../../../shared/types/chat';
import Message from './Message';

interface MessageBranchProps {
	messages: ChatMessage[];
	branchId: string;
	isActive: boolean;
	onEditMessage?: (messageId: string, content: string) => void;
	onDeleteMessage?: (messageId: string) => void;
	onSelectBranch?: (branchId: string) => void;
}

const MessageBranch: React.FC<MessageBranchProps> = ({
	messages,
	branchId,
	isActive,
	onEditMessage,
	onDeleteMessage,
	onSelectBranch,
}) => {
	return (
		<div className={`relative ${isActive ? '' : 'opacity-70 hover:opacity-100'}`}>
			{messages.map((message, index) => (
				<div key={message.id} className="relative">
					{index > 0 && (
						<div className="absolute left-[-20px] top-0 bottom-0 w-4 border-l border-gray-300 border-dashed"></div>
					)}
					<div className="flex items-start">
						{index === 0 && (
							<div className="absolute left-[-24px] top-4">
								<button
									type="button"
									onClick={() => onSelectBranch?.(branchId)}
									className={`w-3 h-3 rounded-full border-2 ${
										isActive
											? 'bg-blue-500 border-blue-500'
											: 'bg-white border-gray-400 hover:border-blue-500'
									}`}
									aria-label={isActive ? 'Active branch' : 'Switch to branch'}
								/>
							</div>
						)}
						<div className="flex-1 ml-4">
							<Message
								message={message}
								isUser={message.role === 'user'}
								onEdit={onEditMessage ? (content) => onEditMessage(message.id, content) : undefined}
								onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
							/>
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

export default MessageBranch;
