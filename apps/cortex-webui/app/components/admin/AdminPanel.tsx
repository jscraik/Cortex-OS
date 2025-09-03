'use client';

import React, { useState } from 'react';
import notificationStore from '../../utils/notification-store';
import Collapsible from '../common/Collapsible';
import Dropdown from '../common/Dropdown';
import Switch from '../common/Switch';

const AdminPanel: React.FC = () => {
  const [settings, setSettings] = useState({
    enableRegistration: true,
    enableChat: true,
    enableSharing: false,
    defaultModel: 'gpt-4',
    maxTokens: 1024,
    temperature: 0.7,
  });

  const modelOptions = [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'claude-2', label: 'Claude 2' },
    { value: 'llama-2', label: 'Llama 2' },
  ];

  const handleSettingChange = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = () => {
    // In a real implementation, this would save to a backend
    console.log('Saving settings:', settings);
    notificationStore.addNotification({
      type: 'success',
      message: 'Settings saved successfully',
    });
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-1">Manage system settings and configurations</p>
      </div>

      <div className="space-y-6">
        <Collapsible title="General Settings" defaultOpen>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Enable User Registration</h3>
                <p className="text-sm text-gray-500">Allow new users to register for accounts</p>
              </div>
              <Switch
                checked={settings.enableRegistration}
                onChange={(checked) => handleSettingChange('enableRegistration', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Enable Chat Functionality</h3>
                <p className="text-sm text-gray-500">Allow users to use the chat interface</p>
              </div>
              <Switch
                checked={settings.enableChat}
                onChange={(checked) => handleSettingChange('enableChat', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Enable Chat Sharing</h3>
                <p className="text-sm text-gray-500">
                  Allow users to share their chat conversations
                </p>
              </div>
              <Switch
                checked={settings.enableSharing}
                onChange={(checked) => handleSettingChange('enableSharing', checked)}
              />
            </div>
          </div>
        </Collapsible>

        <Collapsible title="Model Settings">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Model</label>
              <Dropdown
                options={modelOptions}
                value={settings.defaultModel}
                onChange={(value) => handleSettingChange('defaultModel', value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                The default AI model used for new conversations
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input
                type="number"
                min="1"
                max="4096"
                value={settings.maxTokens}
                onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Maximum number of tokens to generate in a response
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-500">0 (Focused)</span>
                <span className="text-sm text-gray-500">{settings.temperature}</span>
                <span className="text-sm text-gray-500">1 (Creative)</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Controls the randomness of the model's output
              </p>
            </div>
          </div>
        </Collapsible>

        <Collapsible title="System Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900">Version</h3>
              <p className="mt-1 text-sm text-gray-500">v1.0.0</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900">Users</h3>
              <p className="mt-1 text-sm text-gray-500">1,248</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900">Chats</h3>
              <p className="mt-1 text-sm text-gray-500">5,672</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900">Uptime</h3>
              <p className="mt-1 text-sm text-gray-500">99.9%</p>
            </div>
          </div>
        </Collapsible>

        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
