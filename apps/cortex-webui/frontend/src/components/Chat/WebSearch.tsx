'use client';

import React, { useState } from 'react';

interface WebSearchProps {
	query: string;
	onResults: (results: WebSearchResult[]) => void;
	onError: (error: string) => void;
}

interface WebSearchResult {
	title: string;
	url: string;
	snippet: string;
}

const WebSearch: React.FC<WebSearchProps> = ({ query, onResults, onError }) => {
	const [isSearching, setIsSearching] = useState(false);
	const [results, setResults] = useState<WebSearchResult[]>([]);
	const [error, setError] = useState<string | null>(null);

	const performSearch = async () => {
		setIsSearching(true);
		setResults([]);
		setError(null);

		try {
			// In a real implementation, this would call a backend API
			// that interfaces with a search engine like Google or Bing
			// For now, we'll simulate search results with a delay

			// Simulate API call delay
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Simulate search results
			const mockResults: WebSearchResult[] = [
				{
					title: `Search results for "${query}"`,
					url: 'https://example.com/search',
					snippet:
						'This is a simulated search result for your query. In a real implementation, this would show actual search results from the web.',
				},
				{
					title: `About ${query}`,
					url: 'https://example.com/about',
					snippet:
						'Additional information about your search query would appear here in a real implementation.',
				},
				{
					title: `${query} - Wikipedia`,
					url: 'https://wikipedia.org/wiki/Query',
					snippet:
						'Wikipedia would provide detailed information about your search query in a real implementation.',
				},
			];

			setResults(mockResults);
			onResults(mockResults);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Unknown error occurred';
			setError(errorMessage);
			onError(errorMessage);
		} finally {
			setIsSearching(false);
		}
	};

	React.useEffect(() => {
		if (query) {
			performSearch();
		}
	}, [query, performSearch]);

	return (
		<div className="my-2 rounded border border-gray-300">
			<div className="flex justify-between items-center bg-gray-800 text-gray-200 text-xs px-2 py-1">
				<span>Web Search: {query}</span>
				<button
					onClick={performSearch}
					disabled={isSearching}
					className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
				>
					{isSearching ? 'Searching...' : 'Refresh'}
				</button>
			</div>

			{isSearching && (
				<div className="p-4 flex justify-center">
					<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
				</div>
			)}

			{error && <div className="p-2 text-red-600">Error: {error}</div>}

			{!isSearching && results.length > 0 && (
				<div className="p-2">
					<div className="text-xs font-semibold mb-2">Search Results:</div>
					<ul className="space-y-2">
						{results.map((result, index) => (
							<li
								key={index}
								className="border-b border-gray-200 pb-2 last:border-b-0"
							>
								<a
									href={result.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:underline text-sm font-medium"
								>
									{result.title}
								</a>
								<p className="text-gray-600 text-xs mt-1">{result.snippet}</p>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};

export default WebSearch;
