'use client';

import React from 'react';

interface CodespanTokenProps {
  code: string;
}

const CodespanToken: React.FC<CodespanTokenProps> = ({ code }) => {
  return (
    <code className="codespan-token bg-gray-100 rounded px-1 py-0.5 font-mono text-sm">{code}</code>
  );
};

export default CodespanToken;
