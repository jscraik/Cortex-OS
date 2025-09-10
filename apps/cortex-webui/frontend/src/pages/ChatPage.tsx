import type React from 'react';
import ChatInterface from '../components/Chat/ChatInterface';
import Header from '../components/Layout/Header';
import Sidebar from '../components/Layout/Sidebar';
import type { Conversation, Message } from '../types';

interface ChatPageProps {
	conversation: Conversation;
	messages: Message[];
	conversations: Conversation[];
	activeConversationId: string | null;
	onSendMessage: (content: string) => void;
	onSelectConversation: (id: string) => void;
	onCreateConversation: () => void;
	onLogout: () => void;
	onToggleSidebar: () => void;
	streaming: boolean;
	error: string | null;
}

const ChatPage: React.FC<ChatPageProps> = ({
	conversation,
	messages,
	conversations,
	activeConversationId,
	onSendMessage,
	onSelectConversation,
	onCreateConversation,
	onLogout,
	onToggleSidebar,
	streaming,
	error,
}) => {
	return (
		<div className="flex h-screen bg-gray-100">
			{/* Sidebar */}
			<div className="w-64 bg-white border-r hidden md:block">
				<Sidebar
					conversations={conversations}
					activeConversationId={activeConversationId}
					onSelectConversation={onSelectConversation}
					onCreateConversation={onCreateConversation}
					onLogout={onLogout}
				/>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				<Header
					title={conversation.title || 'Untitled Conversation'}
					onToggleSidebar={onToggleSidebar}
				/>
				<main className="flex-1 overflow-hidden">
					<ChatInterface
						messages={messages}
						onSendMessage={onSendMessage}
						streaming={streaming}
						error={error}
					/>
				</main>
			</div>
		</div>
	);
};

export default ChatPage;
