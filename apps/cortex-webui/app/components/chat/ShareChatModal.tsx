'use client';

import React, { useState } from 'react';

interface ShareChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle: string;
}

const ShareChatModal: React.FC<ShareChatModalProps> = ({ isOpen, onClose, chatId, chatTitle }) => {
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareSettings, setShareSettings] = useState({
    allowEdit: false,
    allowCopy: true,
    allowDownload: false,
    expiration: '7d',
  });

  if (!isOpen) return null;

  const generateShareLink = () => {
    // In a real implementation, this would call your API to generate a share link
    const link = `${window.location.origin}/shared/${chatId}?title=${encodeURIComponent(
      chatTitle,
    )}`;
    setShareLink(link);
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareSettingChange = (field: string, value: any) => {
    setShareSettings((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md z-10">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Share Chat</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!shareLink ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chat Title</label>
                <input
                  type="text"
                  value={chatTitle}
                  readOnly
                  className="w-full p-2 border rounded bg-gray-50"
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shareSettings.allowEdit}
                      onChange={(e) => handleShareSettingChange('allowEdit', e.target.checked)}
                      className="rounded"
                    />
                    <span className="ml-2 text-sm">Allow editing</span>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shareSettings.allowCopy}
                      onChange={(e) => handleShareSettingChange('allowCopy', e.target.checked)}
                      className="rounded"
                    />
                    <span className="ml-2 text-sm">Allow copying</span>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shareSettings.allowDownload}
                      onChange={(e) => handleShareSettingChange('allowDownload', e.target.checked)}
                      className="rounded"
                    />
                    <span className="ml-2 text-sm">Allow download</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Expiration
                </label>
                <select
                  value={shareSettings.expiration}
                  onChange={(e) => handleShareSettingChange('expiration', e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="1d">1 day</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                  <option value="never">Never expires</option>
                </select>
              </div>

              <button
                onClick={generateShareLink}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Generate Share Link
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Share Link</label>
                <div className="flex">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 p-2 border rounded-l"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r hover:bg-gray-200"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Share via</h4>
                <div className="flex space-x-2">
                  <button className="flex-1 p-2 border rounded hover:bg-gray-50">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mx-auto text-blue-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs mt-1">Email</span>
                  </button>
                  <button className="flex-1 p-2 border rounded hover:bg-gray-50">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mx-auto text-blue-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs mt-1">Link</span>
                  </button>
                  <button className="flex-1 p-2 border rounded hover:bg-gray-50">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mx-auto text-blue-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 13.5V10a1 1 0 00-1-1h-1.59l-.7-.7a1 1 0 10-1.42 1.42l.7.7H13a1 1 0 001 1v3.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 13.5v-9A1.5 1.5 0 013.5 3H9a1 1 0 100-2H3.5A3.5 3.5 0 000 4.5v9A3.5 3.5 0 003.5 17h9a3.5 3.5 0 003.5-3.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs mt-1">Copy</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareChatModal;
