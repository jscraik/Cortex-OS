'use client';

import React from 'react';

const About: React.FC = () => {
  return (
    <div className="about-settings p-4">
      <h2 className="text-xl font-bold mb-4">About brAInwav Cortex</h2>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">B</span>
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">brAInwav Cortex</h3>
            <p className="text-gray-500">Version 1.0.0</p>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900">About</h4>
          <p className="mt-2 text-gray-600">
            brAInwav Cortex is an advanced AI interface that enables seamless interaction with
            multiple AI models. Built with accessibility and performance in mind, it provides a
            powerful yet intuitive platform for AI-assisted workflows.
          </p>
        </div>

        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900">Features</h4>
          <ul className="mt-2 space-y-1 text-gray-600">
            <li className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Multi-model support</span>
            </li>
            <li className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Real-time streaming responses</span>
            </li>
            <li className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>File attachments and analysis</span>
            </li>
            <li className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Voice input and output</span>
            </li>
            <li className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Code execution environment</span>
            </li>
          </ul>
        </div>

        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900">Links</h4>
          <div className="mt-2 space-y-2">
            <a
              href="https://brainwav.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Official Website
            </a>
            <br />
            <a
              href="https://github.com/brainwav/cortex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              GitHub Repository
            </a>
            <br />
            <a
              href="https://brainwav.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
