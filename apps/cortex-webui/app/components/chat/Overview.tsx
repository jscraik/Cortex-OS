'use client';

import React from 'react';
import { ChatMessage } from '../../utils/chat-store';

interface OverviewProps {
  messages: ChatMessage[];
  onJumpToMessage: (messageId: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ messages, onJumpToMessage }) => {
  // Group messages by date
  const groupedMessages = messages.reduce(
    (acc, message) => {
      const date = new Date(message.timestamp).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(message);
      return acc;
    },
    {} as Record<string, ChatMessage[]>,
  );

  const dates = Object.keys(groupedMessages).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  // Get message preview (first 100 characters)
  const getMessagePreview = (content: string) => {
    const cleanContent = content.replace(/\[.*?\]/g, '').trim();
    return cleanContent.length > 100 ? `${cleanContent.substring(0, 100)}...` : cleanContent;
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat Overview</h2>

      {dates.length === 0 ? (
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
          <p className="mt-2">No messages yet</p>
          <p className="text-sm">Start a conversation to see an overview</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dates.map((date) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {new Date(date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <div className="space-y-2">
                {groupedMessages[date].map((message) => (
                  <div
                    key={message.id}
                    className="p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => onJumpToMessage(message.id)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        {message.role === 'user' ? (
                          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-800">U</span>
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-800">A</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {message.role === 'user' ? 'You' : message.model || 'Assistant'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          {getMessagePreview(message.content)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Overview;
