'use client';

import React, { useState } from 'react';

interface TagInputProps {
  label?: string;
  onAdd?: (name: string) => void;
}

const TagInput: React.FC<TagInputProps> = ({ label = '', onAdd }) => {
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && onAdd) {
      onAdd(newTag.trim());
      setNewTag('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setNewTag('');
    }
  };

  return (
    <div className="flex items-center">
      {label && !newTag && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      )}
      <input
        type="text"
        value={newTag}
        onChange={(e) => setNewTag(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={label || 'Add tag...'}
        className="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        autoFocus
      />
      <button
        onClick={handleAddTag}
        className="px-2 py-1 text-xs bg-gray-100 border border-l-0 rounded-r hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
      >
        Add
      </button>
    </div>
  );
};

export default TagInput;
