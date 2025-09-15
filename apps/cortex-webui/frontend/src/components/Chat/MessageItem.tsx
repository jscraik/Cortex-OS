import React from 'react';
import type { Message } from '../../types';

interface MessageItemProps {
	message: Message;
}

interface MessageItemProps {
	readonly message: {
		id: string;
		role: string;
		content: string;
		[key: string]: any;
	};
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
	const isUser = message.role === 'user';
	return (
		<div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
			<div className="max-w-[80%]">
				<div className="text-xs text-gray-500 dark:text-gray-400">
					{message.role}
				</div>
				<div
					className={`mt-1 px-3 py-2 rounded-xl whitespace-pre-wrap backdrop-blur-sm border border-white/40 dark:border-gray-700 ${
						isUser
							? 'bg-blue-500/20 text-blue-900 dark:text-blue-100'
							: 'bg-white/20 text-gray-900 dark:text-gray-100'
					}`}
				>
					{message.content}
				</div>
			</div>
		</div>
	);
};

export default MessageItem;
