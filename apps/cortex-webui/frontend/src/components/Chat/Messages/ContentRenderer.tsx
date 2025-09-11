'use client';

import type React from 'react';
import Citations from './Citations';
import CodeBlock from './CodeBlock';
import CodeExecutions from './CodeExecutions';
import Markdown from './Markdown/Markdown';
import WebSearchResults from './WebSearchResults';

interface ContentRendererProps {
	content: string;
	contentType?: 'text' | 'markdown' | 'code';
	citations?: any[];
	codeBlocks?: any[];
	executions?: any[];
	webSearchResults?: any[];
}

const ContentRenderer: React.FC<ContentRendererProps> = ({
	content,
	contentType = 'markdown',
	citations = [],
	codeBlocks = [],
	executions = [],
	webSearchResults = [],
}) => {
	const renderContent = () => {
		switch (contentType) {
			case 'code':
				return <CodeBlock code={content} language="text" />;
			case 'markdown':
			default:
				return <Markdown content={content} />;
		}
	};

	return (
		<div className="content-renderer">
			{renderContent()}

			{citations.length > 0 && <Citations citations={citations} />}

			{codeBlocks.length > 0 && (
				<div className="mt-2">
					{codeBlocks.map((block, index) => (
						<CodeBlock
							key={index}
							code={block.code}
							language={block.language}
						/>
					))}
				</div>
			)}

			{executions.length > 0 && <CodeExecutions executions={executions} />}

			{webSearchResults.length > 0 && (
				<WebSearchResults results={webSearchResults} />
			)}
		</div>
	);
};

export default ContentRenderer;
