'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface PromptItem {
  command: string;
  title: string;
  content: string;
}

interface PromptsProps {
  command: string;
  onSelect: (data: { type: string; data: PromptItem }) => void;
}

const Prompts = forwardRef(({ command, onSelect }: PromptsProps, ref) => {
  const [selectedPromptIdx, setSelectedPromptIdx] = useState(0);
  const [filteredPrompts, setFilteredPrompts] = useState<PromptItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const adjustHeightDebounce = useRef<NodeJS.Timeout | null>(null);

  // Mock prompts data - in a real implementation, this would come from a store or API
  const mockPrompts: PromptItem[] = [
    { command: '/summarize', title: 'Summarize Text', content: 'Please summarize the following text:' },
    { command: '/translate', title: 'Translate Text', content: 'Please translate the following text to English:' },
    { command: '/explain', title: 'Explain Concept', content: 'Please explain the following concept in simple terms:' },
    { command: '/code', title: 'Generate Code', content: 'Please write code for the following task:' },
    { command: '/review', title: 'Code Review', content: 'Please review the following code and suggest improvements:' },
  ];

  // Filter prompts based on command
  useEffect(() => {
    const filtered = mockPrompts
      .filter((p) => p.command.toLowerCase().includes(command.toLowerCase()))
      .sort((a, b) => a.title.localeCompare(b.title));

    setFilteredPrompts(filtered);
    setSelectedPromptIdx(0);
  }, [command]);

  // Adjust container height
  const adjustHeight = () => {
    if (containerRef.current) {
      if (adjustHeightDebounce.current) {
        clearTimeout(adjustHeightDebounce.current);
      }

      adjustHeightDebounce.current = setTimeout(() => {
        if (!containerRef.current) return;

        // Ensure the container is visible before adjusting height
        const rect = containerRef.current.getBoundingClientRect();
        containerRef.current.style.maxHeight = Math.max(Math.min(240, rect.bottom - 80), 100) + 'px';
      }, 100);
    }
  };

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', adjustHeight);

    adjustHeight();

    return () => {
      window.removeEventListener('resize', adjustHeight);
      if (adjustHeightDebounce.current) {
        clearTimeout(adjustHeightDebounce.current);
      }
    };
  }, []);

  // Confirm prompt selection
  const confirmPrompt = (promptItem: PromptItem) => {
    onSelect({ type: 'prompt', data: promptItem });
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    selectUp: () => {
      setSelectedPromptIdx((prev) => Math.max(0, prev - 1));
    },
    selectDown: () => {
      setSelectedPromptIdx((prev) => Math.min(prev + 1, filteredPrompts.length - 1));
    }
  }));

  if (filteredPrompts.length === 0) {
    return null;
  }

  return (
    <div
      id="commands-container"
      className="px-2 mb-2 text-left w-full absolute bottom-0 left-0 right-0 z-10"
    >
      <div className="flex w-full rounded-xl border border-gray-100 dark:border-gray-850">
        <div className="flex flex-col w-full rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100">
          <div
            className="m-1 overflow-y-auto p-1 space-y-0.5 scrollbar-hidden max-h-60"
            id="command-options-container"
            ref={containerRef}
          >
            {filteredPrompts.map((promptItem, promptIdx) => (
              <button
                key={promptIdx}
                className={`px-3 py-1.5 rounded-xl w-full text-left ${
                  promptIdx === selectedPromptIdx
                    ? 'bg-gray-50 dark:bg-gray-850 selected-command-option-button'
                    : ''
                }`}
                type="button"
                onClick={() => {
                  confirmPrompt(promptItem);
                }}
                onMouseMove={() => {
                  setSelectedPromptIdx(promptIdx);
                }}
              >
                <div className="font-medium text-black dark:text-gray-100">
                  {promptItem.command}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-100">
                  {promptItem.title}
                </div>
              </button>
            ))}
          </div>

          <div className="px-2 pt-0.5 pb-1 text-xs text-gray-600 dark:text-gray-100 bg-white dark:bg-gray-900 rounded-b-xl flex items-center space-x-1">
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
            </div>
            <div className="line-clamp-1">
              Tip: Update multiple variable slots consecutively by pressing the tab key in the chat input after each replacement.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

Prompts.displayName = 'Prompts';

export default Prompts;
