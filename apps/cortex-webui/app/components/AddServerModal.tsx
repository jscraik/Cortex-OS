'use client';

import React, { useState } from 'react';
import Modal from './common/Modal';
import notificationStore from './utils/notification-store';

interface Server {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
}

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddServer: (server: Omit<Server, 'id' | 'enabled'>) => void;
}

const AddServerModal: React.FC<AddServerModalProps> = ({ isOpen, onClose, onAddServer }) => {
  const [server, setServer] = useState({
    name: '',
    url: '',
    apiKey: '',
  });

  const handleSubmit = () => {
    if (server.name && server.url) {
      onAddServer(server);
      setServer({
        name: '',
        url: '',
        apiKey: '',
      });
      onClose();
      notificationStore.addNotification({
        type: 'success',
        message: 'Server added successfully',
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Server" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Server Name</label>
          <input
            type="text"
            value={server.name}
            onChange={(e) => setServer({ ...server, name: e.target.value })}
            placeholder="e.g., Code Interpreter"
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Server URL</label>
          <input
            type="url"
            value={server.url}
            onChange={(e) => setServer({ ...server, url: e.target.value })}
            placeholder="https://api.example.com"
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key (Optional)</label>
          <input
            type="password"
            value={server.apiKey}
            onChange={(e) => setServer({ ...server, apiKey: e.target.value })}
            placeholder="Enter API key if required"
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-blue-800">Security Note</h4>
          <p className="mt-1 text-sm text-blue-700">
            Make sure the server URL is secure (HTTPS) and that you trust the service. API keys will
            be stored securely.
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
          Add Server
        </button>
      </div>
    </Modal>
  );
};

export default AddServerModal;
