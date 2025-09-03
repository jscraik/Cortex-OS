'use client';

import React from 'react';

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts: Shortcut[] = [
    { key: '⌘ + K', description: 'Open search', category: 'General' },
    { key: '⌘ + N', description: 'New chat', category: 'Chat' },
    { key: '⌘ + Shift + N', description: 'New folder', category: 'Chat' },
    { key: '⌘ + Shift + K', description: 'Focus message input', category: 'Chat' },
    { key: 'Enter', description: 'Send message', category: 'Chat' },
    { key: 'Shift + Enter', description: 'New line', category: 'Chat' },
    { key: 'Esc', description: 'Cancel edit', category: 'Chat' },
    { key: '↑ / ↓', description: 'Navigate messages', category: 'Chat' },
    { key: '⌘ + /', description: 'Open shortcuts', category: 'General' },
    { key: '⌘ + ,', description: 'Open settings', category: 'General' },
    { key: '⌘ + D', description: 'Toggle dark mode', category: 'General' },
    { key: '⌘ + Shift + D', description: 'Toggle document view', category: 'General' },
  ];

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl z-10">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
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

        <div className="p-4 max-h-96 overflow-y-auto">
          {categories.map((category) => (
            <div key={category} className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">{category}</h4>
              <div className="space-y-2">
                {shortcuts
                  .filter((shortcut) => shortcut.category === category)
                  .map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">{shortcut.key}</kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t text-sm text-gray-500">
          <p>Tip: These shortcuts work globally throughout the application.</p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
