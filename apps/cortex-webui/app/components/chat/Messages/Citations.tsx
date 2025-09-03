'use client';

import React, { useState } from 'react';

interface Citation {
  id: string;
  source: string;
  title: string;
  url?: string;
  description?: string;
}

interface CitationsProps {
  citations: Citation[];
}

const Citations: React.FC<CitationsProps> = ({ citations }) => {
  const [expanded, setExpanded] = useState(false);

  if (citations.length === 0) return null;

  const visibleCitations = expanded ? citations : citations.slice(0, 3);

  return (
    <div className="mt-2 border-t border-gray-200 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-700">Sources</h4>
        {citations.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {expanded ? 'Show less' : `Show ${citations.length - 3} more`}
          </button>
        )}
      </div>
      <ul className="mt-1 space-y-1">
        {visibleCitations.map((citation) => (
          <li key={citation.id} className="text-xs">
            <a
              href={citation.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {citation.title}
            </a>
            {citation.description && <p className="text-gray-600 mt-1">{citation.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Citations;
