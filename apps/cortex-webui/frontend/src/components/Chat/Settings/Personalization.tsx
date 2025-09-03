'use client';

import { useSettingsStore } from '@/stores/settingsStore';
import React, { useEffect, useState } from 'react';

interface PersonalizationSettingsProps {
  saveSettings: (settings: any) => void;
}

const PersonalizationSettings: React.FC<PersonalizationSettingsProps> = ({ saveSettings }) => {
  const settings = useSettingsStore();
  const [loaded, setLoaded] = useState(false);

  // Personalization settings state
  const [customInstructions, setCustomInstructions] = useState('');
  const [persona, setPersona] = useState('default');
  const [responseStyle, setResponseStyle] = useState('concise');
  const [creativityLevel, setCreativityLevel] = useState(50);
  const [detailLevel, setDetailLevel] = useState(50);
  const [tonePreference, setTonePreference] = useState('neutral');
  const [communicationStyle, setCommunicationStyle] = useState('professional');
  const [preferredTopics, setPreferredTopics] = useState<string[]>([]);
  const [blockedTopics, setBlockedTopics] = useState<string[]>([]);
  const [enablePersonalization, setEnablePersonalization] = useState(true);

  useEffect(() => {
    if (settings) {
      setCustomInstructions(settings?.personalization?.customInstructions ?? '');
      setPersona(settings?.personalization?.persona ?? 'default');
      setResponseStyle(settings?.personalization?.responseStyle ?? 'concise');
      setCreativityLevel(settings?.personalization?.creativityLevel ?? 50);
      setDetailLevel(settings?.personalization?.detailLevel ?? 50);
      setTonePreference(settings?.personalization?.tonePreference ?? 'neutral');
      setCommunicationStyle(settings?.personalization?.communicationStyle ?? 'professional');
      setPreferredTopics(settings?.personalization?.preferredTopics ?? []);
      setBlockedTopics(settings?.personalization?.blockedTopics ?? []);
      setEnablePersonalization(settings?.personalization?.enablePersonalization ?? true);
      setLoaded(true);
    }
  }, [settings]);

  const handleSubmit = () => {
    saveSettings({
      personalization: {
        customInstructions,
        persona,
        responseStyle,
        creativityLevel,
        detailLevel,
        tonePreference,
        communicationStyle,
        preferredTopics,
        blockedTopics,
        enablePersonalization,
      },
    });
  };

  const addPreferredTopic = (topic: string) => {
    if (topic && !preferredTopics.includes(topic)) {
      setPreferredTopics([...preferredTopics, topic]);
    }
  };

  const removePreferredTopic = (topic: string) => {
    setPreferredTopics(preferredTopics.filter((t) => t !== topic));
  };

  const addBlockedTopic = (topic: string) => {
    if (topic && !blockedTopics.includes(topic)) {
      setBlockedTopics([...blockedTopics, topic]);
    }
  };

  const removeBlockedTopic = (topic: string) => {
    setBlockedTopics(blockedTopics.filter((t) => t !== topic));
  };

  if (!loaded) {
    return <div>Loading...</div>;
  }

  return (
    <div id="tab-personalization" className="flex flex-col h-full justify-between text-sm">
      <div className="overflow-y-scroll max-h-[28rem] lg:max-h-full space-y-6">
        <div>
          <div className="text-base font-medium mb-3">AI Personalization</div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable Personalization</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Allow the AI to adapt to your preferences
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnablePersonalization(!enablePersonalization)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  enablePersonalization ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enablePersonalization ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label htmlFor="custom-instructions" className="block text-sm font-medium mb-1">
                Custom Instructions
              </label>
              <textarea
                id="custom-instructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={4}
                placeholder="Provide specific instructions for how you want the AI to behave..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="persona" className="block text-sm font-medium mb-1">
                Persona
              </label>
              <select
                id="persona"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="default">Default</option>
                <option value="assistant">Helpful Assistant</option>
                <option value="teacher">Teacher</option>
                <option value="developer">Developer</option>
                <option value="writer">Writer</option>
                <option value="analyst">Analyst</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="text-base font-medium mb-3">Response Style</div>

          <div className="space-y-4">
            <div>
              <label htmlFor="response-style" className="block text-sm font-medium mb-1">
                Response Style
              </label>
              <select
                id="response-style"
                value={responseStyle}
                onChange={(e) => setResponseStyle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
                <option value="balanced">Balanced</option>
                <option value="verbose">Verbose</option>
              </select>
            </div>

            <div>
              <label htmlFor="creativity-level" className="block text-sm font-medium mb-1">
                Creativity Level: {creativityLevel}%
              </label>
              <input
                id="creativity-level"
                type="range"
                min="0"
                max="100"
                value={creativityLevel}
                onChange={(e) => setCreativityLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0% (Factual)</span>
                <span>50% (Balanced)</span>
                <span>100% (Creative)</span>
              </div>
            </div>

            <div>
              <label htmlFor="detail-level" className="block text-sm font-medium mb-1">
                Detail Level: {detailLevel}%
              </label>
              <input
                id="detail-level"
                type="range"
                min="0"
                max="100"
                value={detailLevel}
                onChange={(e) => setDetailLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0% (Minimal)</span>
                <span>50% (Moderate)</span>
                <span>100% (Comprehensive)</span>
              </div>
            </div>

            <div>
              <label htmlFor="tone-preference" className="block text-sm font-medium mb-1">
                Tone Preference
              </label>
              <select
                id="tone-preference"
                value={tonePreference}
                onChange={(e) => setTonePreference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="neutral">Neutral</option>
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
            </div>

            <div>
              <label htmlFor="communication-style" className="block text-sm font-medium mb-1">
                Communication Style
              </label>
              <select
                id="communication-style"
                value={communicationStyle}
                onChange={(e) => setCommunicationStyle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="technical">Technical</option>
                <option value="simple">Simple</option>
                <option value="storytelling">Storytelling</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="text-base font-medium mb-3">Content Preferences</div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Topics</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {preferredTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => removePreferredTopic(topic)}
                      className="ml-1 text-blue-800 dark:text-blue-200 hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-3"
                      >
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  placeholder="Add a preferred topic"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addPreferredTopic((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    addPreferredTopic(input.value);
                    input.value = '';
                  }}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-r-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Blocked Topics</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {blockedTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-xs"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => removeBlockedTopic(topic)}
                      className="ml-1 text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-3"
                      >
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  placeholder="Add a blocked topic"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addBlockedTopic((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    addBlockedTopic(input.value);
                    input.value = '';
                  }}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-r-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Add
                </button>
              </div>
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

export default PersonalizationSettings;
