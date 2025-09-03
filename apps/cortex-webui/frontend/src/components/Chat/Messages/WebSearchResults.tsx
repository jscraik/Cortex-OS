'use client';

import React, { useState } from 'react';

interface WebSearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
}

interface WebSearchResultsProps {
  results: WebSearchResult[];
}

const WebSearchResults: React.FC<WebSearchResultsProps> = ({ results }) => {
  const [expanded, setExpanded] = useState(false);

  if (results.length === 0) return null;

  const visibleResults = expanded ? results : results.slice(0, 3);

  return (
    <div className="web-search-results mt-2 border-t border-gray-200 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-700">Web Search Results</h4>
        {results.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {expanded ? 'Show less' : `Show ${results.length - 3} more`}
          </button>
        )}
      </div>
      <div className="mt-2 space-y-2">
        {visibleResults.map((result) => (
          <a
            key={result.id}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2 border rounded hover:bg-gray-50"
          >
            <div className="flex items-start">
              {result.favicon && (
                <img src={result.favicon} alt="" className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <div>
                <div className="text-sm font-medium text-blue-600 hover:underline">
                  {result.title}
                </div>
                <div className="text-xs text-gray-600 mt-1">{result.snippet}</div>
                <div className="text-xs text-gray-500 mt-1">{result.url}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default WebSearchResults;
