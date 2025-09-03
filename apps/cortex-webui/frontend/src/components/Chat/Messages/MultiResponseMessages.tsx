'use client';

import React from 'react';
import Message from './Message';

interface MultiResponseMessagesProps {
  messages: any[];
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

const MultiResponseMessages: React.FC<MultiResponseMessagesProps> = ({
  messages,
  onEditMessage,
  onDeleteMessage,
}) => {
  if (messages.length === 0) return null;

  return (
    <div className="multi-response-messages space-y-4">
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          isUser={message.role === 'user'}
          onEdit={onEditMessage ? (content) => onEditMessage(message.id, content) : undefined}
          onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
        />
      ))}
    </div>
  );
};

export default MultiResponseMessages;
