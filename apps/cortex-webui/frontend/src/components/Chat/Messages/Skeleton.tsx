'use client';

import React from 'react';

const Skeleton: React.FC = () => {
  return (
    <div className="skeleton-message flex w-full justify-start">
      <div className="max-w-[80%]">
        <div className="text-xs text-gray-500 mb-1">
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="rounded px-2 py-1 bg-gray-100">
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 w-4/5 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skeleton;
