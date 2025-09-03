import React from 'react';
import { Conversation } from '../../types';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onLogout,
}) => {
  return (
    <div className="flex flex-col h-full bg-gray-50 border-r">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Conversations</h2>
        <button
          onClick={onCreateConversation}
          className="w-full bg-blue-500 text-white rounded px-4 py-2 mb-4"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul>
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full text-left p-3 border-b ${
                  conversation.id === activeConversationId
                    ? 'bg-blue-100 border-l-4 border-l-blue-500'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium truncate text-sm">
                  {conversation.title || 'Untitled'}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(conversation.updatedAt).toLocaleDateString()}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 border-t">
        <button onClick={onLogout} className="w-full text-left text-red-500 hover:text-red-700">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
