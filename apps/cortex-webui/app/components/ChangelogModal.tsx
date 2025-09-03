'use client';

import React from 'react';
import Modal from './common/Modal';

interface ChangelogItem {
  version: string;
  date: string;
  changes: {
    type: 'added' | 'improved' | 'fixed' | 'removed';
    description: string;
  }[];
}

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const changelog: ChangelogItem[] = [
    {
      version: 'v1.2.0',
      date: '2023-06-15',
      changes: [
        {
          type: 'added',
          description: 'Multi-model support with model selector',
        },
        {
          type: 'added',
          description: 'File attachment capabilities in chat',
        },
        {
          type: 'improved',
          description: 'Enhanced UI with better accessibility compliance',
        },
        {
          type: 'fixed',
          description: 'Resolved streaming connection issues',
        },
      ],
    },
    {
      version: 'v1.1.0',
      date: '2023-05-22',
      changes: [
        {
          type: 'added',
          description: 'Voice recording and transcription feature',
        },
        {
          type: 'added',
          description: 'Code execution capabilities in chat',
        },
        {
          type: 'improved',
          description: 'Performance optimizations for large conversations',
        },
        {
          type: 'fixed',
          description: 'Fixed memory leak in message rendering',
        },
      ],
    },
    {
      version: 'v1.0.0',
      date: '2023-04-10',
      changes: [
        {
          type: 'added',
          description: 'Initial release with core chat functionality',
        },
        {
          type: 'added',
          description: 'Real-time streaming with Server-Sent Events',
        },
        {
          type: 'added',
          description: 'Basic model selection and configuration',
        },
      ],
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-green-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        );
      case 'improved':
        return (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-blue-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </span>
        );
      case 'fixed':
        return (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-yellow-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-yellow-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        );
      case 'removed':
        return (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-red-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'added':
        return 'Added';
      case 'improved':
        return 'Improved';
      case 'fixed':
        return 'Fixed';
      case 'removed':
        return 'Removed';
      default:
        return type;
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'text-green-800 bg-green-100';
      case 'improved':
        return 'text-blue-800 bg-blue-100';
      case 'fixed':
        return 'text-yellow-800 bg-yellow-100';
      case 'removed':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Changelog" size="lg">
      <div className="space-y-8">
        {changelog.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{item.version}</h3>
              <span className="text-sm text-gray-500">{item.date}</span>
            </div>
            <div className="mt-4 space-y-3">
              {item.changes.map((change, changeIndex) => (
                <div key={changeIndex} className="flex items-start">
                  <div className="mt-0.5">{getTypeIcon(change.type)}</div>
                  <div className="ml-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeClass(change.type)}`}
                    >
                      {getTypeLabel(change.type)}
                    </span>
                    <p className="mt-1 text-sm text-gray-700">{change.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          brAInwav Cortex is continuously evolving. Check back regularly for updates and
          improvements.
        </p>
      </div>
    </Modal>
  );
};

export default ChangelogModal;
