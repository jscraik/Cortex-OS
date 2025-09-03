'use client';

import TagInput from '@/components/common/Tags/TagInput';
import TagList from '@/components/common/Tags/TagList';
import React, { useState } from 'react';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface TagsProps {
  tags: Tag[];
  onAddTag?: (name: string) => void;
  onRemoveTag?: (id: string) => void;
}

const Tags: React.FC<TagsProps> = ({ tags, onAddTag, onRemoveTag }) => {
  const [showInput, setShowInput] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-1">
      <TagList tags={tags} onDelete={onRemoveTag} />

      {onAddTag && (
        <>
          {showInput ? (
            <TagInput
              onAdd={(name) => {
                onAddTag(name);
                setShowInput(false);
              }}
            />
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
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
