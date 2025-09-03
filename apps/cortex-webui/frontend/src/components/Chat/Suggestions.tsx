'use client';

import React from 'react';

interface Suggestion {
  id: string;
  text: string;
}

interface SuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
}

const Suggestions: React.FC<SuggestionsProps> = ({ suggestions, onSelect }) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="suggestions p-4 border-t">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Try asking:</h3>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onSelect(suggestion)}
            className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100"
          >
            {suggestion.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Suggestions;
