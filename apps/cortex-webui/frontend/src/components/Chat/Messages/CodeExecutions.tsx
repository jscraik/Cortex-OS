'use client';

import type React from 'react';
import CodeExecution from './CodeExecution';

interface CodeExecutionsProps {
	executions: any[];
}

const CodeExecutions: React.FC<CodeExecutionsProps> = ({ executions }) => {
	type SafeExecution = {
		code: string;
		language: string;
		error?: string;
	};

	if (executions.length === 0) return null;

	return (
		<div className="code-executions mt-2">
			<h4 className="text-xs font-medium text-gray-700 mb-1">Code Executions</h4>
			<div className="space-y-2">
				{executions.map((execution, index) => {
					const safe: SafeExecution = {
						code: typeof execution.code === 'string' ? execution.code : '',
						language: typeof execution.language === 'string' ? execution.language : '',
						error: typeof execution.error === 'string' ? execution.error : undefined,
					};
					return (
						<CodeExecution
							key={index}
							code={safe.code}
							language={safe.language}
							// ...existing code...
							onResult={() => {}}
							onError={() => {}}
						/>
					);
				})}
			</div>
		</div>
	);
};

export default CodeExecutions;
