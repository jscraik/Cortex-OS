'use client';

import React from 'react';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface TagListProps {
  tags: Tag[];
  onDelete?: (id: string) => void;
}

const TagList: React.FC<TagListProps> = ({ tags, onDelete }) => {
  // Default tag colors
  const defaultColors = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  ];

  return (
    <>
      {tags.map((tag, index) => (
        <span
          key={tag.id}
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            tag.color || defaultColors[index % defaultColors.length]
          }`}
        >
          {tag.name}
          {onDelete && (
            <button
              onClick={() => onDelete(tag.id)}
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
    </>
  );
};

export default TagList;
