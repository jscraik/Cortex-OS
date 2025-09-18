'use client';

import type React from 'react';
import { useState } from 'react';

interface CodeExecutionProps {
	code: string;
	language: string;
	onResult: (result: string) => void;
	onError: (error: string) => void;
}

const CodeExecution: React.FC<CodeExecutionProps> = ({ code, language, onResult, onError }) => {
	const [isExecuting, setIsExecuting] = useState(false);
	const [result, setResult] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const executeCode = async () => {
		setIsExecuting(true);
		setResult(null);
		setError(null);

		try {
			// In a real implementation, this would send the code to a backend service
			// for safe execution in a sandboxed environment
			// For now, we'll simulate execution with a delay

			// Simulate API call delay
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Simulate different results based on language
			let executionResult = '';
			switch (language.toLowerCase()) {
				case 'javascript':
					executionResult = `// Executed JavaScript code\nconsole.log("Hello from executed code!");\n// Output: Hello from executed code!`;
					break;
				case 'python':
					executionResult = `# Executed Python code\nprint("Hello from executed code!")\n# Output: Hello from executed code!`;
					break;
				case 'bash':
				case 'shell':
					executionResult = `# Executed shell command\necho "Hello from executed code!"\n# Output: Hello from executed code!`;
					break;
				default:
					executionResult = `# Executed ${language} code\n# Output: Hello from executed code!`;
			}

			setResult(executionResult);
			onResult(executionResult);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
			setError(errorMessage);
			onError(errorMessage);
		} finally {
			setIsExecuting(false);
		}
	};

	return (
		<div className="my-2 rounded border border-gray-300">
			<div className="flex justify-between items-center bg-gray-800 text-gray-200 text-xs px-2 py-1">
				<span>{language} Code Execution</span>
				<button
					onClick={executeCode}
					disabled={isExecuting}
					className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
				>
					{isExecuting ? 'Executing...' : 'Run'}
				</button>
			</div>

			<pre className="p-2 bg-gray-50 overflow-x-auto text-sm">
				<code>{code}</code>
			</pre>

			{(result || error) && (
				<div className="border-t border-gray-300 p-2">
					<div className="text-xs font-semibold mb-1">{error ? 'Error:' : 'Output:'}</div>
					<pre
						className={`p-2 rounded text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}
					>
						{error || result}
					</pre>
				</div>
			)}
		</div>
	);
};

export default CodeExecution;
