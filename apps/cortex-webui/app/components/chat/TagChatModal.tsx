'use client';

import React, { useState } from 'react';
import Tags from './Tags';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle: string;
  initialTags: Tag[];
  onTagsUpdate: (tags: Tag[]) => void;
}

const TagChatModal: React.FC<TagChatModalProps> = ({
  isOpen,
  onClose,
  chatId,
  chatTitle,
  initialTags,
  onTagsUpdate,
}) => {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [newTagName, setNewTagName] = useState('');

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const newTag: Tag = {
        id: Date.now().toString(),
        name: newTagName.trim(),
        color: '', // Will be assigned a color automatically
      };
      const updatedTags = [...tags, newTag];
      setTags(updatedTags);
      setNewTagName('');
    }
  };

  const handleRemoveTag = (id: string) => {
    const updatedTags = tags.filter((tag) => tag.id !== id);
    setTags(updatedTags);
  };

  const handleSave = () => {
    onTagsUpdate(tags);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md z-10">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Tag Chat</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chat Title</label>
            <input
              type="text"
              value={chatTitle}
              readOnly
              className="w-full p-2 border rounded bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Tags</label>
            <Tags tags={tags} onRemoveTag={handleRemoveTag} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Add New Tag</label>
            <div className="flex">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter tag name"
                className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r hover:bg-gray-200"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save Tags
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagChatModal;
