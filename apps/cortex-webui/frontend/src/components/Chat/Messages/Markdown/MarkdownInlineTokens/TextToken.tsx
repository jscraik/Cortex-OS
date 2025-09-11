'use client';

import React from 'react';

interface TextTokenProps {
	text: string;
}

const TextToken: React.FC<TextTokenProps> = ({ text }) => {
	// Convert line breaks to <br> tags
	const lines = text.split('\n');

	return (
		<span className="text-token">
			{lines.map((line, index) => (
				<React.Fragment key={index}>
					{line}
					{index < lines.length - 1 && <br />}
				</React.Fragment>
			))}
		</span>
	);
};

export default TextToken;
