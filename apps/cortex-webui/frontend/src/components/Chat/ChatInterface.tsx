import type React from 'react';
import type { Message } from '../../types';
import MessageInput from './MessageInput';
import MessageList from './MessageList';

interface ChatInterfaceProps {
	messages: Message[];
	onSendMessage: (content: string) => void;
	streaming: boolean;
	error: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
	messages,
	onSendMessage,
	streaming,
	error,
}) => {
	return (
		<div className="flex flex-col h-full glass-card">
			<div className="flex-1 overflow-y-auto p-4">
				<MessageList messages={messages} streaming={streaming} />
			</div>
			<div className="p-4 border-t border-white/40 dark:border-gray-700">
				<MessageInput onSendMessage={onSendMessage} disabled={streaming} />
				{error && (
					<div className="mt-2 text-red-500 text-sm" role="alert">
						{error}
					</div>
				)}
			</div>
		</div>
	);
};

export default ChatInterface;
