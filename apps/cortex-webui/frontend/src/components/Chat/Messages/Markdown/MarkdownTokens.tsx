'use client';

import type React from 'react';
import MarkdownInlineTokens from './MarkdownInlineTokens';

interface MarkdownTokensProps {
	content: string;
}

const MarkdownTokens: React.FC<MarkdownTokensProps> = ({ content }) => {
	// Split content into paragraphs and code blocks
	const tokens = content.split(/(```[\s\S]*?```)/g);

	return (
		<div className="markdown-tokens">
			{tokens.map((token, index) => {
				if (token.startsWith('```') && token.endsWith('```')) {
					// This is a code block
					const codeContent = token.slice(3, -3).trim();
					const lines = codeContent.split('\n');
					const language =
						lines[0] && !lines[0].includes(' ') ? lines[0] : 'text';
					const code =
						language !== 'text' ? lines.slice(1).join('\n') : codeContent;

					return (
						<div key={index} className="my-2">
							<div className="rounded border">
								<div className="flex justify-between items-center bg-gray-800 text-gray-200 text-xs px-2 py-1">
									<span>{language}</span>
									<button
										onClick={() => navigator.clipboard.writeText(code)}
										className="hover:text-white"
										aria-label="Copy code"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
											<path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
										</svg>
									</button>
								</div>
								<pre className="p-2 bg-gray-50 overflow-x-auto text-sm">
									<code>{code}</code>
								</pre>
							</div>
						</div>
					);
				} else {
					// This is regular text content
					return (
						<div key={index} className="my-2">
							<MarkdownInlineTokens content={token} />
						</div>
					);
				}
			})}
		</div>
	);
};

export default MarkdownTokens;
