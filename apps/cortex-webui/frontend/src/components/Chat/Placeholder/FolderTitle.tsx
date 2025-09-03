'use client';

import React from 'react';

interface FolderTitleProps {
  title: string;
}

const FolderTitle: React.FC<FolderTitleProps> = ({ title }) => {
  return (
    <div className="folder-title px-4 py-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
    </div>
  );
};

export default FolderTitle;
