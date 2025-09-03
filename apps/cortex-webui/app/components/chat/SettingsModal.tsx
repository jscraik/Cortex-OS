'use client';

import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: any) => void;
  initialSettings: any;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings,
}) => {
  const [settings, setSettings] = useState(initialSettings);

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md z-10">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Chat Settings</h3>
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

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              {settings.temperature} - Controls randomness
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
            <input
              type="number"
              min="1"
              max="4096"
              value={settings.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            />
            <div className="text-xs text-gray-500 mt-1">Maximum number of tokens to generate</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Top P</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.topP}
              onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">{settings.topP} - Controls diversity</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Web Search</label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.webSearch}
                onChange={(e) => handleChange('webSearch', e.target.checked)}
                className="rounded"
              />
              <span className="ml-2 text-sm">Enable web search for responses</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code Execution</label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.codeExecution}
                onChange={(e) => handleChange('codeExecution', e.target.checked)}
                className="rounded"
              />
              <span className="ml-2 text-sm">Allow code execution in responses</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Memory Query</label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.memoryQuery}
                onChange={(e) => handleChange('memoryQuery', e.target.checked)}
                className="rounded"
              />
              <span className="ml-2 text-sm">Enable memory querying</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
