'use client';

import { useSettingsStore } from '@/stores/settingsStore';
import React, { useEffect, useRef } from 'react';

interface ModelItemMenuProps {
  show: boolean;
  setShow: (show: boolean) => void;
  model: any;
  pinModelHandler: (modelId: string) => void;
  copyLinkHandler: () => void;
  children: React.ReactNode;
}

const ModelItemMenu: React.FC<ModelItemMenuProps> = ({
  show,
  setShow,
  model,
  pinModelHandler,
  copyLinkHandler,
  children,
}) => {
  const settings = useSettingsStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, setShow]);

  if (!show) return <>{children}</>;

  return (
    <>
      {children}
      <div ref={menuRef} className="fixed inset-0 z-50" onClick={() => setShow(false)}>
        <div
          className="absolute w-full max-w-[180px] text-sm rounded-xl px-1 py-1.5 z-[9999999] bg-white dark:bg-gray-850 dark:text-white shadow-lg border border-gray-300/30 dark:border-gray-700/40"
          style={{
            top: '100%',
            right: 0,
            transform: 'translateY(0.5rem)',
          }}
        >
          <button
            type="button"
            className="flex rounded-md py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              pinModelHandler(model?.id);
              setShow(false);
            }}
            aria-pressed={(settings?.pinnedModels ?? []).includes(model?.id)}
          >
            {(settings?.pinnedModels ?? []).includes(model?.id) ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                >
                  <path d="M10 2.5a.75.75 0 0 1 .75.75v7.5h7.5a.75.75 0 0 1 0 1.5h-7.5v7.5a.75.75 0 0 1-1.5 0v-7.5h-7.5a.75.75 0 0 1 0-1.5h7.5v-7.5A.75.75 0 0 1 10 2.5Z" />
                </svg>
                <div className="flex items-center">Hide from Sidebar</div>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2.5a.75.75 0 0 1 .75.75v7.5h7.5a.75.75 0 0 1 0 1.5h-7.5v7.5a.75.75 0 0 1-1.5 0v-7.5h-7.5a.75.75 0 0 1 0-1.5h7.5v-7.5A.75.75 0 0 1 10 2.5Z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex items-center">Keep in Sidebar</div>
              </>
            )}
          </button>

          <button
            type="button"
            className="flex rounded-md py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              copyLinkHandler();
              setShow(false);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
            >
              <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
              <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
            </svg>
            <div className="flex items-center">Copy Link</div>
          </button>
        </div>
      </div>
    </>
  );
};

export default ModelItemMenu;
