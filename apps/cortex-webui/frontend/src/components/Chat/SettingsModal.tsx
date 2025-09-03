'use client';

import Modal from '@/components/common/Modal';
import React, { useState } from 'react';
import AccountSettings from './Settings/Account';
import AdvancedSettings from './Settings/Advanced';
import AudioSettings from './Settings/Audio';
import ChatsSettings from './Settings/Chats';
import ConnectionsSettings from './Settings/Connections';
import GeneralSettings from './Settings/General';
import InterfaceSettings from './Settings/Interface';
import PersonalizationSettings from './Settings/Personalization';
import ToolsSettings from './Settings/Tools';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');

  const saveSettings = (newSettings: any) => {
    // In a real implementation, this would save to a store or API
    console.log('Saving settings:', newSettings);
    // For now, we'll just show a notification
    // @ts-ignore
    if (typeof window !== 'undefined' && window.addNotification) {
      // @ts-ignore
      window.addNotification('success', 'Settings saved successfully!');
    }
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'interface', label: 'Interface' },
    { id: 'chats', label: 'Chats' },
    { id: 'audio', label: 'Audio' },
    { id: 'personalization', label: 'Personalization' },
    { id: 'tools', label: 'Tools' },
    { id: 'connections', label: 'Connections' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'account', label: 'Account' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings saveSettings={saveSettings} />;
      case 'interface':
        return <InterfaceSettings saveSettings={saveSettings} />;
      case 'chats':
        return <ChatsSettings saveSettings={saveSettings} />;
      case 'audio':
        return <AudioSettings saveSettings={saveSettings} />;
      case 'personalization':
        return <PersonalizationSettings saveSettings={saveSettings} />;
      case 'tools':
        return <ToolsSettings saveSettings={saveSettings} />;
      case 'connections':
        return <ConnectionsSettings saveSettings={saveSettings} />;
      case 'advanced':
        return <AdvancedSettings saveSettings={saveSettings} />;
      case 'account':
        return <AccountSettings saveSettings={saveSettings} saveHandler={() => {}} />;
      default:
        return <GeneralSettings saveSettings={saveSettings} />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="xl">
      <div className="flex flex-col h-[calc(100vh-200px)]">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-4">{renderTabContent()}</div>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
