'use client';

import React from 'react';
import FolderKnowledge from './FolderKnowledge';
import FolderTitle from './FolderTitle';

interface ChatListProps {
  onCreateNewChat: () => void;
}

const ChatList: React.FC<ChatListProps> = ({ onCreateNewChat }) => {
  return (
    <div className="chat-list h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">Chats</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <FolderTitle title="Today" />
        <div className="p-2">
          <button
            onClick={onCreateNewChat}
            className="w-full flex items-center p-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="ml-3">New chat</span>
          </button>
        </div>

        <FolderTitle title="Yesterday" />
        <FolderKnowledge />
      </div>
    </div>
  );
};

export default ChatList;
