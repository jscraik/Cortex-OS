'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../../../utils/chat-store';
import Message from './Message';

interface MessagesProps {
  messages: ChatMessage[];
  streaming: boolean;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

const Messages: React.FC<MessagesProps> = ({
  messages,
  streaming,
  onEditMessage,
  onDeleteMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            isUser={message.role === 'user'}
            onEdit={onEditMessage ? (content) => onEditMessage(message.id, content) : undefined}
            onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
          />
        ))}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="text-xs text-gray-500">Assistant</div>
              <div className="bg-gray-100 rounded px-2 py-1">
                <span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full mr-1"></span>
                <span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full mr-1 delay-75"></span>
                <span className="inline-block h-2 w-2 animate-pulse bg-gray-400 rounded-full delay-150"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default Messages;
