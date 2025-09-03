import React from 'react';
import { Message } from '../../types';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  streaming: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, streaming }) => {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      {streaming && (
        <div className="flex justify-start">
          <div className="max-w-[80%]">
            <div className="text-xs text-gray-500">assistant</div>
            <div className="bg-gray-100 rounded px-2 py-1">
              <span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full mr-1"></span>
              <span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full mr-1 delay-75"></span>
              <span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full delay-150"></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
