'use client';

import React from 'react';

interface OverviewProps {
  chats: any[];
  onChatSelect: (chatId: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ chats, onChatSelect }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Chat Overview</h2>
      <div className="space-y-4">
        {chats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p className="mt-2">No chats yet</p>
            <p className="text-sm">Start a new conversation to see it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => onChatSelect(chat.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{chat.title || 'Untitled Chat'}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {chat.timestamp ? new Date(chat.timestamp).toLocaleDateString() : 'Just now'}
                  </div>
                </div>
                {chat.tags && chat.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {chat.tags.map((tag: any, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Overview;
