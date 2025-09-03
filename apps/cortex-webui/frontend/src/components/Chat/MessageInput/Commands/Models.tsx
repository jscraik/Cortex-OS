'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface ModelItem {
  id: string;
  name: string;
  value: string;
  info?: {
    meta?: {
      profile_image_url?: string;
      hidden?: boolean;
      tags?: { name: string }[];
      description?: string;
    };
  };
}

interface ModelsProps {
  command: string;
  onSelect: (data: { type: string; data: ModelItem }) => void;
}

const Models = forwardRef(({ command, onSelect }: ModelsProps, ref) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filteredItems, setFilteredItems] = useState<ModelItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const adjustHeightDebounce = useRef<NodeJS.Timeout | null>(null);

  // Mock models data - in a real implementation, this would come from a store or API
  const mockModels: ModelItem[] = [
    {
      id: '1',
      name: 'GPT-4',
      value: 'gpt-4',
      info: {
        meta: {
          profile_image_url: '/static/favicon.png',
          description: 'Most capable GPT-4 model',
        },
      },
    },
    {
      id: '2',
      name: 'GPT-3.5 Turbo',
      value: 'gpt-3.5-turbo',
      info: {
        meta: {
          profile_image_url: '/static/favicon.png',
          description: 'Fast and capable model',
        },
      },
    },
    {
      id: '3',
      name: 'Claude 2',
      value: 'claude-2',
      info: {
        meta: {
          profile_image_url: '/static/favicon.png',
          description: "Anthropic's advanced model",
        },
      },
    },
    {
      id: '4',
      name: 'LLaMA 2',
      value: 'llama-2',
      info: {
        meta: {
          profile_image_url: '/static/favicon.png',
          description: 'Open source model from Meta',
        },
      },
    },
  ];

  // Filter models based on command
  useEffect(() => {
    const filtered = command.slice(1)
      ? mockModels.filter(
          (model) =>
            !model?.info?.meta?.hidden &&
            (model.value.toLowerCase().includes(command.slice(1).toLowerCase()) ||
              model.name.toLowerCase().includes(command.slice(1).toLowerCase()) ||
              (model?.info?.meta?.tags?.map((tag) => tag.name).join(' ') || '')
                .toLowerCase()
                .includes(command.slice(1).toLowerCase())),
        )
      : mockModels.filter((model) => !model?.info?.meta?.hidden);

    setFilteredItems(filtered);
    setSelectedIdx(0);
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
        containerRef.current.style.maxHeight =
          Math.max(Math.min(240, rect.bottom - 100), 100) + 'px';
      }, 100);
    }
  };

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', adjustHeight);

    // Focus on chat input
    const chatInputElement = document.getElementById('chat-input');
    if (chatInputElement) {
      chatInputElement.focus();
    }

    adjustHeight();

    return () => {
      window.removeEventListener('resize', adjustHeight);
      if (adjustHeightDebounce.current) {
        clearTimeout(adjustHeightDebounce.current);
      }
    };
  }, []);

  // Confirm selection
  const confirmSelect = (model: ModelItem) => {
    onSelect({ type: 'model', data: model });
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    selectUp: () => {
      setSelectedIdx((prev) => Math.max(0, prev - 1));
    },
    selectDown: () => {
      setSelectedIdx((prev) => Math.min(prev + 1, filteredItems.length - 1));
    },
  }));

  if (filteredItems.length === 0) {
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
            className="m-1 overflow-y-auto p-1 rounded-r-lg space-y-0.5 scrollbar-hidden max-h-60"
            id="command-options-container"
            ref={containerRef}
          >
            {filteredItems.map((model, modelIdx) => (
              <button
                key={modelIdx}
                className={`px-3 py-1.5 rounded-xl w-full text-left ${
                  modelIdx === selectedIdx
                    ? 'bg-gray-50 dark:bg-gray-850 selected-command-option-button'
                    : ''
                }`}
                type="button"
                onClick={() => {
                  confirmSelect(model);
                }}
                onMouseMove={() => {
                  setSelectedIdx(modelIdx);
                }}
              >
                <div className="flex font-medium text-black dark:text-gray-100 line-clamp-1">
                  <img
                    src={model?.info?.meta?.profile_image_url || '/static/favicon.png'}
                    alt={model?.name || model.id}
                    className="rounded-full size-6 items-center mr-2"
                  />
                  {model.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

Models.displayName = 'Models';

export default Models;
