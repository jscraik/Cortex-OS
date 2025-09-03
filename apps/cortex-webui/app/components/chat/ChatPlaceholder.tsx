'use client';

import Link from 'next/link';
import React from 'react';

interface ChatPlaceholderProps {
  onStartNewChat: () => void;
}

const ChatPlaceholder: React.FC<ChatPlaceholderProps> = ({ onStartNewChat }) => {
  const features = [
    {
      title: 'Multi-Model Support',
      description: 'Switch between different AI models for different tasks',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
    },
    {
      title: 'File Attachments',
      description: 'Upload and analyze documents, images, and other files',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
          />
        </svg>
      ),
    },
    {
      title: 'Voice Input',
      description: 'Speak naturally and convert speech to text',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-purple-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      ),
    },
    {
      title: 'Code Execution',
      description: 'Run code snippets directly in the chat interface',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-yellow-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="max-w-2xl">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">Welcome to brAInwav Cortex</h1>
        <p className="mt-2 text-gray-600">
          Start a new conversation or explore the powerful features of our AI-powered chat
          interface.
        </p>

        <div className="mt-8">
          <button
            onClick={onStartNewChat}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Start New Chat
          </button>
        </div>

        <div className="mt-12">
          <h2 className="text-lg font-medium text-gray-900">Powerful Features</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start p-4 bg-white rounded-lg shadow">
                <div className="flex-shrink-0">{feature.icon}</div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">{feature.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>
            Need help? Check out our{' '}
            <Link href="/docs" className="text-blue-600 hover:text-blue-500">
              documentation
            </Link>{' '}
            or{' '}
            <Link href="/support" className="text-blue-600 hover:text-blue-500">
              contact support
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPlaceholder;
