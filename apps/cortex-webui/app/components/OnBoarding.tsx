'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

interface OnBoardingProps {
  onComplete: () => void;
}

const OnBoarding: React.FC<OnBoardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const router = useRouter();

  const totalSteps = 3;

  const models = [
    { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model, great for complex tasks' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and capable for most tasks' },
    { id: 'claude-2', name: 'Claude 2', description: 'Great for analysis and long documents' },
    { id: 'llama-2', name: 'Llama 2', description: 'Open source model, good for privacy' },
  ];

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId],
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Save onboarding completion
      localStorage.setItem('onboardingComplete', 'true');
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">Welcome to brAInwav Cortex</h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started with our AI-powered chat interface. We'll guide you through the basics in
              just a few steps.
            </p>
          </div>
        );
      case 2:
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900">Select Your Models</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose which AI models you'd like to use. You can always change this later.
            </p>
            <div className="mt-4 space-y-3">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer ${
                    selectedModels.includes(model.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleModelToggle(model.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.id)}
                    onChange={() => {}}
                    className="mt-1 h-4 w-4 text-blue-600 rounded"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{model.name}</div>
                    <div className="text-xs text-gray-500">{model.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">You're All Set!</h3>
            <p className="mt-2 text-sm text-gray-500">
              You're ready to start using brAInwav Cortex. Here are some quick tips to get you
              started:
            </p>
            <ul className="mt-4 text-left text-sm text-gray-500 space-y-2">
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
                <span>
                  Use <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">⌘ + K</kbd> to search
                  anything
                </span>
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
                <span>Attach files by dragging them into the chat</span>
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
                <span>Try voice input by clicking the microphone icon</span>
              </li>
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md z-10">
        <div className="p-6">{renderStep()}</div>

        <div className="p-4 border-t flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={step === 1}
            className={`px-4 py-2 text-sm rounded ${
              step === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Back
          </button>

          <div className="flex items-center">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full mx-1 ${
                  i + 1 === step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {step === totalSteps ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnBoarding;
