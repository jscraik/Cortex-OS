'use client';

import React, { useState } from 'react';
import { ChatMessage } from '../../../../utils/chat-store';

interface MessageProps {
  message: ChatMessage;
  isUser: boolean;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
}

const Message: React.FC<MessageProps> = ({ message, isUser, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onEdit) {
      onEdit(editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%]">
        <div className="text-xs text-gray-500">{isUser ? 'You' : message.model || 'Assistant'}</div>
        {isEditing ? (
          <div className="rounded px-2 py-1 bg-gray-100">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button onClick={handleCancel} className="px-3 py-1 text-sm border rounded">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`rounded px-2 py-1 whitespace-pre-wrap ${
              isUser ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            {message.content}
            {!isUser && onEdit && (
              <div className="flex justify-end mt-1 space-x-2">
                <button onClick={handleEdit} className="text-xs text-gray-500 hover:text-gray-700">
                  Edit
                </button>
                {onDelete && (
                  <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
