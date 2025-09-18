'use client';

import type React from 'react';

interface FolderPlaceholderProps {
	onImportChat: () => void;
}

const FolderPlaceholder: React.FC<FolderPlaceholderProps> = ({ onImportChat }) => {
	return (
		<div className="folder-placeholder text-center p-8">
			<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-8 w-8 text-blue-600"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
					/>
				</svg>
			</div>

			<h3 className="mt-4 text-lg font-medium text-gray-900">No chats selected</h3>
			<p className="mt-2 text-gray-500">
				Select a chat from the sidebar or create a new one to get started.
			</p>

			<div className="mt-6">
				<button
					onClick={onImportChat}
					className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 mr-2"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
							clipRule="evenodd"
						/>
					</svg>
					Import Chat
				</button>
			</div>
		</div>
	);
};

export default FolderPlaceholder;
