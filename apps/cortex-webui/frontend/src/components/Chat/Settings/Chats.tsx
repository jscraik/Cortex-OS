'use client';

import { useSettingsStore } from '@/stores/settingsStore';
import React, { useEffect, useState } from 'react';

interface ChatsSettingsProps {
  saveSettings: (settings: any) => void;
}

const ChatsSettings: React.FC<ChatsSettingsProps> = ({ saveSettings }) => {
  const settings = useSettingsStore();
  const [loaded, setLoaded] = useState(false);

  // Chats settings state
  const [autoTitleChat, setAutoTitleChat] = useState(true);
  const [recentChatCount, setRecentChatCount] = useState(5);
  const [chatDirection, setChatDirection] = useState('ltr');
  const [chatSpacing, setChatSpacing] = useState('compact');
  const [showCodeByDefault, setShowCodeByDefault] = useState(false);
  const [continuousChat, setContinuousChat] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [autoSaveChat, setAutoSaveChat] = useState(true);
  const [chatHistoryLimit, setChatHistoryLimit] = useState(30);

  useEffect(() => {
    if (settings) {
      setAutoTitleChat(settings?.chats?.autoTitleChat ?? true);
      setRecentChatCount(settings?.chats?.recentChatCount ?? 5);
      setChatDirection(settings?.chats?.chatDirection ?? 'ltr');
      setChatSpacing(settings?.chats?.chatSpacing ?? 'compact');
      setShowCodeByDefault(settings?.chats?.showCodeByDefault ?? false);
      setContinuousChat(settings?.chats?.continuousChat ?? false);
      setExportFormat(settings?.chats?.exportFormat ?? 'pdf');
      setAutoSaveChat(settings?.chats?.autoSaveChat ?? true);
      setChatHistoryLimit(settings?.chats?.chatHistoryLimit ?? 30);
      setLoaded(true);
    }
  }, [settings]);

  const handleSubmit = () => {
    saveSettings({
      chats: {
        autoTitleChat,
        recentChatCount,
        chatDirection,
        chatSpacing,
        showCodeByDefault,
        continuousChat,
        exportFormat,
        autoSaveChat,
        chatHistoryLimit,
      },
    });
  };

  if (!loaded) {
    return <div>Loading...</div>;
  }

  return (
    <div id="tab-chats" className="flex flex-col h-full justify-between text-sm">
      <div className="overflow-y-scroll max-h-[28rem] lg:max-h-full space-y-6">
        <div>
          <div className="text-base font-medium mb-3">Chat Management</div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-title Chats</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Automatically generate titles for new chats
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoTitleChat(!autoTitleChat)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  autoTitleChat ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoTitleChat ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-save Chats</div>
                <div className="text-xs text-gray-500 mt-0.5">Automatically save chat progress</div>
              </div>
              <button
                type="button"
                onClick={() => setAutoSaveChat(!autoSaveChat)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  autoSaveChat ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSaveChat ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label htmlFor="recent-chat-count" className="block text-sm font-medium mb-1">
                Recent Chats Count: {recentChatCount}
              </label>
              <input
                id="recent-chat-count"
                type="range"
                min="1"
                max="20"
                value={recentChatCount}
                onChange={(e) => setRecentChatCount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>10</span>
                <span>20</span>
              </div>
            </div>

            <div>
              <label htmlFor="chat-history-limit" className="block text-sm font-medium mb-1">
                Chat History Limit: {chatHistoryLimit} days
              </label>
              <input
                id="chat-history-limit"
                type="range"
                min="1"
                max="365"
                value={chatHistoryLimit}
                onChange={(e) => setChatHistoryLimit(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 day</span>
                <span>30 days</span>
                <span>365 days</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-base font-medium mb-3">Chat Display</div>

          <div className="space-y-4">
            <div>
              <label htmlFor="chat-direction" className="block text-sm font-medium mb-1">
                Chat Direction
              </label>
              <select
                id="chat-direction"
                value={chatDirection}
                onChange={(e) => setChatDirection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="ltr">Left to Right</option>
                <option value="rtl">Right to Left</option>
              </select>
            </div>

            <div>
              <label htmlFor="chat-spacing" className="block text-sm font-medium mb-1">
                Chat Spacing
              </label>
              <select
                id="chat-spacing"
                value={chatSpacing}
                onChange={(e) => setChatSpacing(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Show Code by Default</div>
                <div className="text-xs text-gray-500 mt-0.5">Expand code blocks automatically</div>
              </div>
              <button
                type="button"
                onClick={() => setShowCodeByDefault(!showCodeByDefault)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  showCodeByDefault ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showCodeByDefault ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="text-base font-medium mb-3">Chat Behavior</div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Continuous Chat</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Continue conversation without starting new chat
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContinuousChat(!continuousChat)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  continuousChat ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    continuousChat ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label htmlFor="export-format" className="block text-sm font-medium mb-1">
                Default Export Format
              </label>
              <select
                id="export-format"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="pdf">PDF</option>
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default ChatsSettings;
