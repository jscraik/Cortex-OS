'use client';

import React from 'react';

interface AddFilesPlaceholderProps {
  title?: string;
  content?: string;
  children?: React.ReactNode;
}

const AddFilesPlaceholder: React.FC<AddFilesPlaceholderProps> = ({
  title = 'Add Files',
  content = 'Drop any files here to upload',
  children,
}) => {
  return (
    <div className="px-3">
      <div className="text-center text-6xl mb-3">📄</div>
      <div className="text-center dark:text-white text-xl font-semibold z-50">{title}</div>

      {children ? (
        children
      ) : (
        <div className="px-2 mt-2 text-center text-sm dark:text-gray-200 w-full">{content}</div>
      )}
    </div>
  );
};

export default AddFilesPlaceholder;
