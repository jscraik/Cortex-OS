import type React from 'react';
import type { Conversation } from '../../types';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
	conversations: Conversation[];
	activeConversationId: string | null;
	onSelectConversation: (id: string) => void;
	onCreateConversation: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
	conversations,
	activeConversationId,
	onSelectConversation,
	onCreateConversation,
}) => {
	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b">
				<button
					onClick={onCreateConversation}
					className="w-full bg-blue-500 text-white rounded px-4 py-2"
				>
					New Conversation
				</button>
			</div>
			<div className="flex-1 overflow-y-auto">
				{conversations.length === 0 ? (
					<div className="p-4 text-center text-gray-500">
						No conversations yet. Start a new one!
					</div>
				) : (
					<ul>
						{conversations.map((conversation) => (
							<ConversationItem
								key={conversation.id}
								conversation={conversation}
								isActive={conversation.id === activeConversationId}
								onClick={() => onSelectConversation(conversation.id)}
							/>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};

export default ConversationList;
