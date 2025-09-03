'use client';

import React, { useState } from 'react';
import Modal from './common/Modal';
import notificationStore from './utils/notification-store';

interface Connection {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'ollama' | 'custom';
  apiKey: string;
  baseUrl: string;
  models: string[];
}

interface AddConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddConnection: (connection: Omit<Connection, 'id'>) => void;
}

const AddConnectionModal: React.FC<AddConnectionModalProps> = ({
  isOpen,
  onClose,
  onAddConnection,
}) => {
  const [connection, setConnection] = useState({
    name: '',
    type: 'openai' as 'openai' | 'anthropic' | 'ollama' | 'custom',
    apiKey: '',
    baseUrl: '',
    models: [] as string[],
  });

  const [newModel, setNewModel] = useState('');

  const connectionTypes = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'ollama', label: 'Ollama' },
    { value: 'custom', label: 'Custom API' },
  ];

  const handleAddModel = () => {
    if (newModel.trim() && !connection.models.includes(newModel.trim())) {
      setConnection({
        ...connection,
        models: [...connection.models, newModel.trim()],
      });
      setNewModel('');
    }
  };

  const handleRemoveModel = (model: string) => {
    setConnection({
      ...connection,
      models: connection.models.filter((m) => m !== model),
    });
  };

  const handleSubmit = () => {
    if (connection.name && connection.type) {
      onAddConnection(connection);
      setConnection({
        name: '',
        type: 'openai',
        apiKey: '',
        baseUrl: '',
        models: [],
      });
      onClose();
      notificationStore.addNotification({
        type: 'success',
        message: 'Connection added successfully',
      });
    }
  };

  const getTypeSpecificFields = () => {
    switch (connection.type) {
      case 'openai':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                value={connection.apiKey}
                onChange={(e) => setConnection({ ...connection, apiKey: e.target.value })}
                placeholder="sk-... (required)"
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-500"
                >
                  OpenAI Dashboard
                </a>
              </p>
            </div>
          </>
        );
      case 'anthropic':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                value={connection.apiKey}
                onChange={(e) => setConnection({ ...connection, apiKey: e.target.value })}
                placeholder="sk-ant-... (required)"
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Get your API key from{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-500"
                >
                  Anthropic Console
                </a>
              </p>
            </div>
          </>
        );
      case 'ollama':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input
                type="url"
                value={connection.baseUrl}
                onChange={(e) => setConnection({ ...connection, baseUrl: e.target.value })}
                placeholder="http://localhost:11434 (default)"
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Make sure Ollama is running and accessible
              </p>
            </div>
          </>
        );
      case 'custom':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input
                type="url"
                value={connection.baseUrl}
                onChange={(e) => setConnection({ ...connection, baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key (Optional)
              </label>
              <input
                type="password"
                value={connection.apiKey}
                onChange={(e) => setConnection({ ...connection, apiKey: e.target.value })}
                placeholder="Enter API key if required"
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Connection" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Connection Name</label>
          <input
            type="text"
            value={connection.name}
            onChange={(e) => setConnection({ ...connection, name: e.target.value })}
            placeholder="e.g., My OpenAI Account"
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Connection Type</label>
          <select
            value={connection.type}
            onChange={(e) => setConnection({ ...connection, type: e.target.value as any })}
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {connectionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {getTypeSpecificFields()}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Models</label>
          <div className="flex">
            <input
              type="text"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder="e.g., gpt-4, claude-2"
              className="flex-1 px-3 py-2 border rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddModel()}
            />
            <button
              onClick={handleAddModel}
              className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r-md hover:bg-gray-200"
            >
              Add
            </button>
          </div>
          {connection.models.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {connection.models.map((model) => (
                <span
                  key={model}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {model}
                  <button
                    onClick={() => handleRemoveModel(model)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
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
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Add the models you want to use with this connection
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add Connection
        </button>
      </div>
    </Modal>
  );
};

export default AddConnectionModal;
