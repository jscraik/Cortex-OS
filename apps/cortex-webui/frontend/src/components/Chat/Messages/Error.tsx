'use client';

import type React from 'react';

interface ErrorProps {
	message: string;
	onRetry?: () => void;
}

const Error: React.FC<ErrorProps> = ({ message, onRetry }) => {
	return (
		<div className="error-message flex w-full justify-start">
			<div className="max-w-[80%]">
				<div className="text-xs text-gray-500 mb-1">Assistant</div>
				<div className="rounded px-2 py-1 bg-red-100 border border-red-200">
					<div className="flex items-start">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clipRule="evenodd"
							/>
						</svg>
						<div className="ml-2 text-sm text-red-700">
							<p>{message}</p>
							{onRetry && (
								<button
									onClick={onRetry}
									className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
								>
									Retry
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Error;
