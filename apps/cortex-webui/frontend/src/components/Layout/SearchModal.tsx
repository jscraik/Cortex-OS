import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
	id: string;
	title: string;
	type: 'chat' | 'note' | 'document';
	lastModified: Date;
}

interface SearchModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchResult[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	const renderResultIcon = (type: SearchResult['type']) => {
		if (type === 'chat') {
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-4 w-4 text-blue-600"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<title>Chat icon</title>
					<path
						fillRule="evenodd"
						d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
						clipRule="evenodd"
					/>
				</svg>
			);
		} else if (type === 'note') {
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-4 w-4 text-blue-600"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<title>Note icon</title>
					<path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
				</svg>
			);
		} else {
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-4 w-4 text-blue-600"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<title>Document icon</title>
					<path
						fillRule="evenodd"
						d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
						clipRule="evenodd"
					/>
				</svg>
			);
		}
	};

	const renderEmptyState = () => {
		if (query) {
			return (
				<div className="p-8 text-center text-gray-500">
					No results found for "{query}"
				</div>
			);
		} else {
			return (
				<div className="p-8 text-center text-gray-500">
					Type to search conversations, notes, and documents
				</div>
			);
		}
	};

	// Mock search results - in a real app, this would call an API
	useEffect(() => {
		if (query.trim() === '') {
			setResults([]);
			return;
		}

		// Simulate search results
		const mockResults: SearchResult[] = [
			{
				id: '1',
				title: 'AI Development Discussion',
				type: 'chat' as const,
				lastModified: new Date(),
			},
			{
				id: '2',
				title: 'Project Planning Notes',
				type: 'note' as const,
				lastModified: new Date(Date.now() - 86400000),
			},
			{
				id: '3',
				title: 'Research on Machine Learning',
				type: 'document' as const,
				lastModified: new Date(Date.now() - 172800000),
			},
		].filter((result) =>
			result.title.toLowerCase().includes(query.toLowerCase()),
		);

		setResults(mockResults);
		setSelectedIndex(0);
	}, [query]);

	// Focus input when modal opens
	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen]);

	const handleSelectResult = useCallback(
		(result: SearchResult) => {
			onClose();
			setQuery('');

			// Navigate to the selected result
			if (result.type === 'chat') {
				navigate(`/chat/${result.id}`);
			} else if (result.type === 'note') {
				navigate(`/notes/${result.id}`);
			} else {
				navigate(`/documents/${result.id}`);
			}
		},
		[onClose, navigate],
	);

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isOpen) return;

			if (e.key === 'Escape') {
				onClose();
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setSelectedIndex((prev) => Math.max(prev - 1, 0));
			} else if (e.key === 'Enter' && results.length > 0) {
				e.preventDefault();
				handleSelectResult(results[selectedIndex]);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, results, selectedIndex, onClose, handleSelectResult]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
			<button
				className="fixed inset-0 bg-black bg-opacity-50"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === 'Escape') onClose();
				}}
				aria-label="Close search modal"
				type="button"
			/>

			<div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl z-10">
				<div className="p-4 border-b">
					<div className="relative">
						<input
							ref={inputRef}
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search conversations, notes, and documents..."
							className="w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 absolute left-3 top-3.5 text-gray-400"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<title>Search icon</title>
							<path
								fillRule="evenodd"
								d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
				</div>

				{results.length > 0 ? (
					<div className="max-h-96 overflow-y-auto">
						<ul>
							{results.map((result, index) => (
								<button
									key={result.id}
									className={`w-full text-left p-3 border-b hover:bg-gray-50 ${
										index === selectedIndex ? 'bg-blue-50' : ''
									}`}
									onClick={() => handleSelectResult(result)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleSelectResult(result);
										}
									}}
									type="button"
								>
									<div className="flex items-center">
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
											{renderResultIcon(result.type)}
										</div>
										<div className="ml-3">
											<div className="text-sm font-medium text-gray-900">
												{result.title}
											</div>
											<div className="text-xs text-gray-500">
												{result.type.charAt(0).toUpperCase() +
													result.type.slice(1)}{' '}
												• {result.lastModified.toLocaleDateString()}
											</div>
										</div>
									</div>
								</button>
							))}
						</ul>
					</div>
				) : (
					renderEmptyState()
				)}

				<div className="p-3 border-t text-xs text-gray-500 flex justify-between">
					<div>
						<kbd className="px-2 py-1 bg-gray-100 rounded">↑</kbd>
						<kbd className="px-2 py-1 bg-gray-100 rounded ml-1">↓</kbd> to
						navigate
					</div>
					<div>
						<kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> to select
					</div>
					<div>
						<kbd className="px-2 py-1 bg-gray-100 rounded">Esc</kbd> to close
					</div>
				</div>
			</div>
		</div>
	);
};

export default SearchModal;
