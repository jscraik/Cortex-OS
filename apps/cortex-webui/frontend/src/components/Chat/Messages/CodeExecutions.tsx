'use client';

import React from 'react';
import CodeExecution from './CodeExecution';

interface CodeExecutionsProps {
  executions: any[];
}

const CodeExecutions: React.FC<CodeExecutionsProps> = ({ executions }) => {
  if (executions.length === 0) return null;

  return (
    <div className="code-executions mt-2">
      <h4 className="text-xs font-medium text-gray-700 mb-1">Code Executions</h4>
      <div className="space-y-2">
        {executions.map((execution, index) => (
          <CodeExecution
            key={index}
            code={execution.code}
            language={execution.language}
            result={execution.result}
            error={execution.error}
            onResult={() => {}}
            onError={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

export default CodeExecutions;
