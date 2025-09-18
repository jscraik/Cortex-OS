'use client';

import type React from 'react';
import { useState } from 'react';

interface Citation {
	id: string;
	title: string;
	url: string;
	content: string;
}

interface CitationsProps {
	citations: Citation[];
	onCitationClick?: (citation: Citation) => void;
}

const Citations: React.FC<CitationsProps> = ({ citations, onCitationClick: _onCitationClick }) => {
	const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

	const toggleCitation = (id: string) => {
		setExpandedCitation(expandedCitation === id ? null : id);
	};

	const getDomain = (url: string): string => {
		try {
			const domain = new URL(url).hostname;
			return domain.startsWith('www.') ? domain.substring(4) : domain;
		} catch {
			return url;
		}
	};

	if (!citations || citations.length === 0) {
		return null;
	}

	return (
		<div className="mt-3">
			<div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Sources:</div>
			<div className="space-y-2">
				{citations.map((citation, index) => (
					<div
						key={citation.id}
						className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
					>
						<button
							type="button"
							className="flex items-center justify-between w-full p-3 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
							onClick={() => toggleCitation(citation.id)}
						>
							<div className="flex items-center">
								<span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 flex items-center justify-center text-xs font-medium mr-3">
									{index + 1}
								</span>
								<div>
									<div className="font-medium text-sm">{citation.title}</div>
									<div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
										{getDomain(citation.url)}
									</div>
								</div>
							</div>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								className={`size-5 text-gray-400 transition-transform duration-200 ${expandedCitation === citation.id ? 'rotate-180' : ''}`}
							>
								<title>
									{expandedCitation === citation.id ? 'Collapse' : 'Expand'} citation details
								</title>
								<path
									fillRule="evenodd"
									d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
									clipRule="evenodd"
								/>
							</svg>
						</button>

						{expandedCitation === citation.id && (
							<div className="p-3 bg-white dark:bg-gray-850 border-t border-gray-200 dark:border-gray-700">
								<div className="text-sm mb-2">{citation.content}</div>
								<a
									href={citation.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
									onClick={(e) => e.stopPropagation()}
								>
									View source
								</a>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

export default Citations;
