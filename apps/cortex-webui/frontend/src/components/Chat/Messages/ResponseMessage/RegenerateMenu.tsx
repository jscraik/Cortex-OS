'use client';

import React, { useState } from 'react';

interface RegenerateMenuProps {
  onRegenerate?: () => void;
  onBranch?: () => void;
  onEdit?: () => void;
}

const RegenerateMenu: React.FC<RegenerateMenuProps> = ({ onRegenerate, onBranch, onEdit }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="regenerate-menu relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mt-1 text-xs text-gray-500 hover:text-gray-700"
      >
        Options
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 right-0 bg-white border rounded shadow-lg py-1">
          {onRegenerate && (
            <button
              onClick={() => {
                onRegenerate();
                setIsOpen(false);
              }}
              className="block w-full text-left px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
            >
              Regenerate
            </button>
          )}

          {onBranch && (
            <button
              onClick={() => {
                onBranch();
                setIsOpen(false);
              }}
              className="block w-full text-left px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
            >
              Branch Response
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
              className="block w-full text-left px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
            >
              Edit Response
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RegenerateMenu;
