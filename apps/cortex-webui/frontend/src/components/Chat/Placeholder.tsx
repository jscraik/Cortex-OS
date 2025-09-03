'use client';

import React from 'react';
import ChatList from './Placeholder/ChatList';
import FolderPlaceholder from './Placeholder/FolderPlaceholder';

interface PlaceholderProps {
  onCreateNewChat: () => void;
  onImportChat: () => void;
}

const Placeholder: React.FC<PlaceholderProps> = ({ onCreateNewChat, onImportChat }) => {
  return (
    <div className="placeholder flex h-full">
      <div className="w-1/3 border-r">
        <ChatList onCreateNewChat={onCreateNewChat} />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <FolderPlaceholder onImportChat={onImportChat} />
      </div>
    </div>
  );
};

export default Placeholder;
