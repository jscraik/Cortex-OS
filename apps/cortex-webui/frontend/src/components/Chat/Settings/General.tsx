'use client';

import { useSettingsStore } from '@/stores/settingsStore';
import React, { useEffect, useState } from 'react';

interface GeneralSettingsProps {
  saveSettings: (settings: any) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ saveSettings }) => {
  const settings = useSettingsStore();
  const [loaded, setLoaded] = useState(false);

  // General settings state
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');
  const [fontSize, setFontSize] = useState('base');
  const [defaultModel, setDefaultModel] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [autoScrollOutput, setAutoScrollOutput] = useState(true);
  const [enterToSubmit, setEnterToSubmit] = useState(true);
  const [doubleEnterToSubmit, setDoubleEnterToSubmit] = useState(false);
  const [showUsernameInChat, setShowUsernameInChat] = useState(true);
  const [showModelNameInChat, setShowModelNameInChat] = useState(true);

  useEffect(() => {
    if (settings) {
      setTheme(settings?.general?.theme ?? 'dark');
      setLanguage(settings?.general?.language ?? 'en');
      setFontSize(settings?.general?.fontSize ?? 'base');
      setDefaultModel(settings?.general?.defaultModel ?? '');
      setDefaultPrompt(settings?.general?.defaultPrompt ?? '');
      setAutoScrollOutput(settings?.general?.autoScrollOutput ?? true);
      setEnterToSubmit(settings?.general?.enterToSubmit ?? true);
      setDoubleEnterToSubmit(settings?.general?.doubleEnterToSubmit ?? false);
      setShowUsernameInChat(settings?.general?.showUsernameInChat ?? true);
      setShowModelNameInChat(settings?.general?.showModelNameInChat ?? true);
      setLoaded(true);
    }
  }, [settings]);

  const handleSubmit = () => {
    saveSettings({
      general: {
        theme,
        language,
        fontSize,
        defaultModel,
        defaultPrompt,
        autoScrollOutput,
        enterToSubmit,
        doubleEnterToSubmit,
        showUsernameInChat,
        showModelNameInChat,
      },
    });
  };

  if (!loaded) {
    return <div>Loading...</div>;
  }

  return (
    <div id="tab-general" className="flex flex-col h-full justify-between text-sm">
      <div className="overflow-y-scroll max-h-[28rem] lg:max-h-full space-y-6">
        <div>
          <div className="text-base font-medium mb-3">Appearance</div>

          <div className="space-y-4">
            <div>
              <label htmlFor="theme" className="block text-sm font-medium mb-1">
                Theme
              </label>
              <select
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium mb-1">
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            <div>
              <label htmlFor="font-size" className="block text-sm font-medium mb-1">
                Font Size
              </label>
              <select
                id="font-size"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="sm">Small</option>
                <option value="base">Normal</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="text-base font-medium mb-3">Behavior</div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-scroll Output</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Automatically scroll to the latest message
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoScrollOutput(!autoScrollOutput)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  autoScrollOutput ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoScrollOutput ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enter to Submit</div>
                <div className="text-xs text-gray-500 mt-0.5">Press Enter to send messages</div>
              </div>
              <button
                type="button"
                onClick={() => setEnterToSubmit(!enterToSubmit)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  enterToSubmit ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enterToSubmit ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {enterToSubmit && (
              <div className="flex items-center justify-between pl-4">
                <div>
                  <div className="font-medium">Double Enter to Submit</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Press Enter twice to send messages
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDoubleEnterToSubmit(!doubleEnterToSubmit)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    doubleEnterToSubmit ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      doubleEnterToSubmit ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Show Username in Chat</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Display your username in chat messages
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUsernameInChat(!showUsernameInChat)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  showUsernameInChat ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showUsernameInChat ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Show Model Name in Chat</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Display the model name in chat messages
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModelNameInChat(!showModelNameInChat)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  showModelNameInChat ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showModelNameInChat ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="text-base font-medium mb-3">Defaults</div>

          <div className="space-y-4">
            <div>
              <label htmlFor="default-model" className="block text-sm font-medium mb-1">
                Default Model
              </label>
              <input
                id="default-model"
                type="text"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                placeholder="gpt-4, claude-2, etc."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="default-prompt" className="block text-sm font-medium mb-1">
                Default Prompt
              </label>
              <textarea
                id="default-prompt"
                value={defaultPrompt}
                onChange={(e) => setDefaultPrompt(e.target.value)}
                rows={3}
                placeholder="You are a helpful assistant..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
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

export default GeneralSettings;
