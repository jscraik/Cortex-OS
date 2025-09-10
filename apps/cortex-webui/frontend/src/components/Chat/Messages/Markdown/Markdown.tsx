'use client';

import type React from 'react';
import MarkdownTokens from './MarkdownTokens';

interface MarkdownProps {
	content: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content }) => {
	return (
		<div className="markdown-content">
			<MarkdownTokens content={content} />
		</div>
	);
};

export default Markdown;
