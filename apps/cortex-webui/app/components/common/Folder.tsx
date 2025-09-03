'use client';

import React from 'react';

interface FolderProps {
  folder: {
    id: string;
    name: string;
    children?: any[];
  };
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (item: any) => void;
  isSelected: boolean;
}

const Folder: React.FC<FolderProps> = ({
  folder,
  depth,
  isExpanded,
  onToggle,
  onSelect,
  isSelected,
}) => {
  return (
    <div
      className={`flex items-center p-2 cursor-pointer rounded ${
        isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(folder);
        onToggle();
      }}
    >
      <div className="flex items-center flex-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mr-1 text-gray-500 hover:text-gray-700"
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-blue-500 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z"
            clipRule="evenodd"
          />
          <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
        </svg>
        <span className="ml-2 text-sm font-medium text-gray-900 truncate">{folder.name}</span>
      </div>
      {folder.children && (
        <span className="text-xs text-gray-500 ml-2">{folder.children.length}</span>
      )}
    </div>
  );
};

export default Folder;
