'use client';

import { Token } from 'marked';
import React, { useMemo } from 'react';

interface SourceProps {
  id: string;
  token: Token;
  onClick?: (id: string, data: string) => void;
}

const Source: React.FC<SourceProps> = ({ id, token, onClick }) => {
  const attributes = useMemo(() => {
    const attrs: Record<string, string> = {};
    if (token.text) {
      const regex = /(\w+)="([^"]*)"/g;
      let match;

      while ((match = regex.exec(token.text)) !== null) {
        attrs[match[1]] = match[2];
      }
    }
    return attrs;
  }, [token.text]);

  const getDomain = (url: string): string => {
    const domain = url.replace('http://', '').replace('https://', '').split(/[/?#]/)[0];
    return domain;
  };

  const formattedTitle = (title: string): string => {
    if (title.startsWith('http')) {
      return getDomain(title);
    }
    return title;
  };

  if (attributes.title === 'N/A') return null;

  return (
    <button
      className="text-xs font-medium w-fit translate-y-[2px] px-2 py-0.5 dark:bg-white/5 dark:text-white/60 dark:hover:text-white bg-gray-50 text-black/60 hover:text-black transition rounded-lg"
      onClick={() => {
        if (onClick) {
          onClick(id, attributes.data || '');
        }
      }}
    >
      <span className="line-clamp-1">
        {attributes.title ? formattedTitle(attributes.title) : ''}
      </span>
    </button>
  );
};

export default Source;
