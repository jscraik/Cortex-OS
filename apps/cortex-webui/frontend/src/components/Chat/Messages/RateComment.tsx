'use client';

import React, { useState } from 'react';

interface RateCommentProps {
  messageId: string;
  onRate: (messageId: string, rating: 'positive' | 'negative') => void;
}

const RateComment: React.FC<RateCommentProps> = ({ messageId, onRate }) => {
  const [rated, setRated] = useState<'positive' | 'negative' | null>(null);

  const handleRate = (rating: 'positive' | 'negative') => {
    setRated(rating);
    onRate(messageId, rating);
  };

  if (rated) {
    return (
      <div className="rate-comment flex items-center text-xs text-gray-500 mt-1">
        <span>Thank you for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="rate-comment flex items-center text-xs text-gray-500 mt-1">
      <span className="mr-2">Rate this response:</span>
      <button
        onClick={() => handleRate('positive')}
        className="p-1 text-green-500 hover:text-green-700"
        aria-label="Rate positive"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <button
        onClick={() => handleRate('negative')}
        className="p-1 text-red-500 hover:text-red-700"
        aria-label="Rate negative"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

export default RateComment;
