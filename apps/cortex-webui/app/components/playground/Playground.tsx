'use client';

import React, { useState } from 'react';
import notificationStore from '../../utils/notification-store';
import CodeEditor from '../common/CodeEditor';

const Playground: React.FC = () => {
  const [code, setCode] = useState('// Write your code here\nconsole.log("Hello, brAInwav!");');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');

    try {
      // Simulate code execution
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In a real implementation, this would send the code to a backend service
      const result = `Output:\nHello, brAInwav!\n\nExecution time: 0.125s`;
      setOutput(result);

      notificationStore.addNotification({
        type: 'success',
        message: 'Code executed successfully',
      });
    } catch (error) {
      console.error('Error executing code:', error);
      setOutput('Error: Failed to execute code');

      notificationStore.addNotification({
        type: 'error',
        message: 'Failed to execute code',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearOutput = () => {
    setOutput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-900">Code Playground</h1>
        <p className="text-sm text-gray-500 mt-1">Write and execute code in a secure environment</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col border-r">
          <div className="p-2 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-700">Code Editor</h2>
            <div className="flex space-x-2">
              <button
                onClick={clearOutput}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Clear
              </button>
              <button
                onClick={runCode}
                disabled={isRunning}
                className={`px-3 py-1 text-xs text-white rounded ${
                  isRunning ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isRunning ? 'Running...' : 'Run Code'}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <CodeEditor value={code} onChange={setCode} language="javascript" className="h-full" />
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="p-2 bg-gray-50 border-b">
            <h2 className="text-sm font-medium text-gray-700">Output</h2>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-gray-900 text-green-400 font-mono text-sm">
            {output || <div className="text-gray-500">Click "Run Code" to execute your code</div>}
          </div>
        </div>
      </div>

      <div className="p-4 border-t text-xs text-gray-500">
        <p>
          Note: This is a simulated environment. In a production implementation, code would be
          executed in a secure sandbox.
        </p>
      </div>
    </div>
  );
};

export default Playground;
