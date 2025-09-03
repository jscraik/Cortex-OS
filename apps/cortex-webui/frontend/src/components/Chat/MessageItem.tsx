import React from 'react';
import { Message } from '../../types';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%]">
        <div className="text-xs text-gray-500">{message.role}</div>
        <div
          className={`rounded px-2 py-1 whitespace-pre-wrap ${
            message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
