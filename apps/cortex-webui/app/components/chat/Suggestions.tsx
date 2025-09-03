'use client';

import React from 'react';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

interface SuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (prompt: string) => void;
}

const Suggestions: React.FC<SuggestionsProps> = ({ suggestions, onSelect }) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Suggestions</h2>

      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="mt-2">No suggestions available</p>
          <p className="text-sm">Try different prompts to see suggestions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="p-4 bg-white border rounded-lg cursor-pointer hover:bg-gray-50"
              onClick={() => onSelect(suggestion.prompt)}
            >
              <h3 className="text-sm font-medium text-gray-900">{suggestion.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{suggestion.description}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Try it
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Suggestions;
