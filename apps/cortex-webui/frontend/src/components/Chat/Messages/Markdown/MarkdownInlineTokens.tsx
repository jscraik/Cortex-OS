'use client';

import type React from 'react';
import CodespanToken from './MarkdownInlineTokens/CodespanToken';
import TextToken from './MarkdownInlineTokens/TextToken';

interface MarkdownInlineTokensProps {
	content: string;
}

const MarkdownInlineTokens: React.FC<MarkdownInlineTokensProps> = ({ content }) => {
	// Split content by inline code spans
	const tokens = content.split(/(`[^`]*`)/g);

	return (
		<div className="markdown-inline-tokens">
			{tokens.map((token, index) => {
				if (token.startsWith('`') && token.endsWith('`')) {
					// This is an inline code span
					const code = token.slice(1, -1);
					return <CodespanToken key={index} code={code} />;
				} else {
					// This is regular text
					return <TextToken key={index} text={token} />;
				}
			})}
		</div>
	);
};

export default MarkdownInlineTokens;
