'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import Modal from '@/components/common/Modal';

interface SearchResult {
	id: string;
	title: string;
	content: string;
	type: 'chat' | 'message' | 'file';
	timestamp: string;
	chatId?: string;
}

interface SearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	onResultSelect: (result: SearchResult) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onResultSelect }) => {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const inputRef = useRef<HTMLInputElement>(null);

	// Mock search results for demonstration
	const mockResults: SearchResult[] = [
		{
			id: '1',
			title: 'Project Discussion',
			content: "Let's discuss the new project requirements...",
			type: 'chat',
			timestamp: '2023-05-15T10:30:00Z',
		},
		{
			id: '2',
			title: 'API Implementation',
			content: "I've implemented the new API endpoints...",
			type: 'message',
			timestamp: '2023-05-14T14:22:00Z',
			chatId: '1',
		},
		{
			id: '3',
			title: 'Documentation.pdf',
			content: 'Project documentation and specifications',
			type: 'file',
			timestamp: '2023-05-13T09:15:00Z',
		},
		{
			id: '4',
			title: 'Team Meeting Notes',
			content: "Action items from today's team meeting...",
			type: 'chat',
			timestamp: '2023-05-12T16:45:00Z',
		},
		{
			id: '5',
			title: 'Bug Fix',
			content: 'Fixed the authentication issue...',
			type: 'message',
			timestamp: '2023-05-11T11:30:00Z',
			chatId: '4',
		},
	];

	useEffect(() => {
		if (isOpen) {
			setQuery('');
			setResults([]);
			setSelectedIndex(-1);
			setTimeout(() => {
				if (inputRef.current) {
					inputRef.current.focus();
				}
			}, 100);
		}
	}, [isOpen]);

	useEffect(() => {
		if (query.trim() === '') {
			setResults([]);
			return;
		}

		setIsLoading(true);

		// Simulate API call delay
		const timer = setTimeout(() => {
			const filteredResults = mockResults.filter(
				(result) =>
					result.title.toLowerCase().includes(query.toLowerCase()) ||
					result.content.toLowerCase().includes(query.toLowerCase()),
			);
			setResults(filteredResults);
			setIsLoading(false);
		}, 300);

		return () => clearTimeout(timer);
	}, [query]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setSelectedIndex((prev) => Math.max(prev - 1, -1));
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (selectedIndex >= 0 && selectedIndex < results.length) {
				onResultSelect(results[selectedIndex]);
			} else if (results.length > 0) {
				onResultSelect(results[0]);
			}
		} else if (e.key === 'Escape') {
			onClose();
		}
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case 'chat':
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="size-5"
					>
						<path d="M3 5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H3z" />
						<path d="M1 7a1 1 0 011-1h16a1 1 0 011 1v0a1 1 0 01-1 1H2a1 1 0 01-1-1v0z" />
					</svg>
				);
			case 'message':
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="size-5"
					>
						<path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
						<path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
					</svg>
				);
			case 'file':
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="size-5"
					>
						<path
							fillRule="evenodd"
							d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
							clipRule="evenodd"
						/>
					</svg>
				);
			default:
				return null;
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Search" size="lg">
			<div className="p-4">
				<div className="relative">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="size-5 text-gray-400"
						>
							<path
								fillRule="evenodd"
								d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Search chats, messages, and files..."
						className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div className="mt-4 max-h-96 overflow-y-auto">
					{isLoading ? (
						<div className="flex justify-center py-8">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
						</div>
					) : results.length > 0 ? (
						<ul className="space-y-1">
							{results.map((result, index) => (
								<li key={result.id}>
									<button
										className={`w-full text-left p-3 rounded-md transition-colors ${
											selectedIndex === index
												? 'bg-blue-100 dark:bg-blue-900'
												: 'hover:bg-gray-100 dark:hover:bg-gray-800'
										}`}
										onClick={() => onResultSelect(result)}
									>
										<div className="flex items-start">
											<div className="flex-shrink-0 mt-0.5 text-gray-400 dark:text-gray-500">
												{getTypeIcon(result.type)}
											</div>
											<div className="ml-3 flex-1 min-w-0">
												<div className="flex items-baseline">
													<div className="text-sm font-medium text-gray-900 dark:text-white truncate">
														{result.title}
													</div>
													<div className="ml-2 text-xs text-gray-500 dark:text-gray-400">
														{formatDate(result.timestamp)}
													</div>
												</div>
												<div className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
													{result.content}
												</div>
												<div className="mt-1">
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
														{result.type.charAt(0).toUpperCase() + result.type.slice(1)}
													</span>
												</div>
											</div>
										</div>
									</button>
								</li>
							))}
						</ul>
					) : query.trim() !== '' ? (
						<div className="text-center py-8">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="mx-auto h-12 w-12 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
								No results found
							</h3>
							<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
								Try adjusting your search terms.
							</p>
						</div>
					) : null}
				</div>
			</div>
		</Modal>
	);
};

export default SearchModal;
