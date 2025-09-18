'use client';

import React, { useState } from 'react';

interface MemoryItem {
	id: string;
	content: string;
	timestamp: number;
	relevance: number;
}

interface MemoryQueryProps {
	query: string;
	onResults: (results: MemoryItem[]) => void;
	onError: (error: string) => void;
}

const MemoryQuery: React.FC<MemoryQueryProps> = ({ query, onResults, onError }) => {
	const [isSearching, setIsSearching] = useState(false);
	const [results, setResults] = useState<MemoryItem[]>([]);
	const [error, setError] = useState<string | null>(null);

	const performMemorySearch = async () => {
		setIsSearching(true);
		setResults([]);
		setError(null);

		try {
			// In a real implementation, this would call a backend API
			// that interfaces with a vector database or memory store
			// For now, we'll simulate search results with a delay

			// Simulate API call delay
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Simulate memory search results
			const mockResults: MemoryItem[] = [
				{
					id: 'mem1',
					content: `Previous conversation about ${query} discussed various approaches to implementation.`,
					timestamp: Date.now() - 3600000, // 1 hour ago
					relevance: 0.95,
				},
				{
					id: 'mem2',
					content: `User mentioned ${query} in a previous session, expressing interest in advanced features.`,
					timestamp: Date.now() - 86400000, // 1 day ago
					relevance: 0.87,
				},
				{
					id: 'mem3',
					content: `Documentation reference for ${query} was accessed recently.`,
					timestamp: Date.now() - 172800000, // 2 days ago
					relevance: 0.76,
				},
			];

			setResults(mockResults);
			onResults(mockResults);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
			setError(errorMessage);
			onError(errorMessage);
		} finally {
			setIsSearching(false);
		}
	};

	React.useEffect(() => {
		if (query) {
			performMemorySearch();
		}
	}, [query, performMemorySearch]);

	const formatTimeAgo = (timestamp: number) => {
		const now = Date.now();
		const diff = now - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
		if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
		if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
		return 'Just now';
	};

	return (
		<div className="my-2 rounded border border-gray-300">
			<div className="flex justify-between items-center bg-gray-800 text-gray-200 text-xs px-2 py-1">
				<span>Memory Context: {query}</span>
				<button
					onClick={performMemorySearch}
					disabled={isSearching}
					className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-50"
				>
					{isSearching ? 'Searching...' : 'Refresh'}
				</button>
			</div>

			{isSearching && (
				<div className="p-4 flex justify-center">
					<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
				</div>
			)}

			{error && <div className="p-2 text-red-600">Error: {error}</div>}

			{!isSearching && results.length > 0 && (
				<div className="p-2">
					<div className="text-xs font-semibold mb-2">Relevant Memories:</div>
					<ul className="space-y-2">
						{results.map((result) => (
							<li key={result.id} className="border-b border-gray-200 pb-2 last:border-b-0">
								<div className="flex justify-between">
									<span className="text-xs text-gray-500">{formatTimeAgo(result.timestamp)}</span>
									<span className="text-xs text-purple-600">
										{(result.relevance * 100).toFixed(0)}% relevant
									</span>
								</div>
								<p className="text-gray-700 text-sm mt-1">{result.content}</p>
							</li>
						))}
					</ul>
				</div>
			)}

			{!isSearching && results.length === 0 && !error && (
				<div className="p-2 text-gray-500 text-sm">No relevant memories found.</div>
			)}
		</div>
	);
};

export default MemoryQuery;
