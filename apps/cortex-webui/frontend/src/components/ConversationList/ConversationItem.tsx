import type React from 'react';
import type { Conversation } from '../../types';

interface ConversationItemProps {
	conversation: Conversation;
	isActive: boolean;
	onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, isActive, onClick }) => {
	return (
		<li>
			<button
				onClick={onClick}
				className={`w-full text-left p-4 border-b ${
					isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
				}`}
			>
				<div className="font-medium truncate">{conversation.title || 'Untitled'}</div>
				<div className="text-xs text-gray-500">
					{new Date(conversation.updatedAt).toLocaleDateString()}
				</div>
			</button>
		</li>
	);
};

export default ConversationItem;
