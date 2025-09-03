'use client';

import React, { useState } from 'react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagsProps {
  tags: Tag[];
  onAddTag?: (name: string) => void;
  onRemoveTag?: (id: string) => void;
}

const Tags: React.FC<TagsProps> = ({ tags, onAddTag, onRemoveTag }) => {
  const [newTag, setNewTag] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && onAddTag) {
      onAddTag(newTag.trim());
      setNewTag('');
      setShowInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setShowInput(false);
      setNewTag('');
    }
  };

  // Default tag colors
  const defaultColors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
  ];

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag, index) => (
        <span
          key={tag.id}
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            tag.color || defaultColors[index % defaultColors.length]
          }`}
        >
          {tag.name}
          {onRemoveTag && (
            <button
              onClick={() => onRemoveTag(tag.id)}
              className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full"
              aria-label={`Remove ${tag.name} tag`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </span>
      ))}

      {onAddTag && (
        <>
          {showInput ? (
            <div className="flex items-center">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={() => {
                  if (!newTag.trim()) {
                    setShowInput(false);
                  }
                }}
                placeholder="Tag name"
                className="px-2 py-1 text-xs border rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddTag}
                className="px-2 py-1 text-xs bg-gray-100 border border-l-0 rounded-r hover:bg-gray-200"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add tag
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Tags;
