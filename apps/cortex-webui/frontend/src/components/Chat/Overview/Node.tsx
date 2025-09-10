'use client';

import type React from 'react';

interface NodeProps {
	node: any;
	onSelect: (nodeId: string) => void;
}

const Node: React.FC<NodeProps> = ({ node, onSelect }) => {
	const getNodeStyle = () => {
		switch (node.type) {
			case 'chat':
				return 'bg-blue-100 border-blue-300';
			case 'document':
				return 'bg-green-100 border-green-300';
			case 'tool':
				return 'bg-purple-100 border-purple-300';
			default:
				return 'bg-gray-100 border-gray-300';
		}
	};

	const getNodeIcon = () => {
		switch (node.type) {
			case 'chat':
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 text-blue-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
						/>
					</svg>
				);
			case 'document':
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 text-green-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				);
			case 'tool':
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 text-purple-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				);
			default:
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 text-gray-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
						/>
					</svg>
				);
		}
	};

	return (
		<div
			className={`absolute p-3 rounded-lg border-2 shadow-sm cursor-pointer transition-all hover:shadow-md ${getNodeStyle()}`}
			style={{
				left: `${node.x}px`,
				top: `${node.y}px`,
				width: '120px',
			}}
			onClick={() => onSelect(node.id)}
		>
			<div className="flex items-center">
				{getNodeIcon()}
				<span className="ml-2 text-sm font-medium truncate">{node.title}</span>
			</div>
			{node.description && (
				<p className="mt-1 text-xs text-gray-600 line-clamp-2">
					{node.description}
				</p>
			)}
			<div className="mt-2 flex justify-between text-xs text-gray-500">
				<span>{node.type}</span>
				{node.timestamp && (
					<span>{new Date(node.timestamp).toLocaleDateString()}</span>
				)}
			</div>
		</div>
	);
};

export default Node;
