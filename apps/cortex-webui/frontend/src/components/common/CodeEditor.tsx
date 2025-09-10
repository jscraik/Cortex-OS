'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface CodeEditorProps {
	value: string;
	onChange: (value: string) => void;
	language?: string;
	readOnly?: boolean;
	className?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
	value,
	onChange,
	language = 'javascript',
	readOnly = false,
	className = '',
}) => {
	const [isFocused, setIsFocused] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const preRef = useRef<HTMLPreElement>(null);

	// Auto-resize textarea
	useEffect(() => {
		if (textareaRef.current && preRef.current) {
			preRef.current.innerHTML = value || ' ';
			textareaRef.current.style.height = `${preRef.current.scrollHeight}px`;
		}
	}, [value]);

	// Handle tab key for indentation
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (readOnly) return;

		if (e.key === 'Tab') {
			e.preventDefault();
			const { selectionStart, selectionEnd } = e.currentTarget;
			const newValue =
				value.substring(0, selectionStart) +
				'  ' +
				value.substring(selectionEnd);
			onChange(newValue);

			// Move cursor position
			setTimeout(() => {
				if (textareaRef.current) {
					textareaRef.current.selectionStart = selectionStart + 2;
					textareaRef.current.selectionEnd = selectionStart + 2;
				}
			}, 0);
		}
	};

	// Get language class for syntax highlighting
	const getLanguageClass = () => {
		switch (language) {
			case 'javascript':
			case 'js':
				return 'language-javascript';
			case 'typescript':
			case 'ts':
				return 'language-typescript';
			case 'python':
			case 'py':
				return 'language-python';
			case 'html':
				return 'language-html';
			case 'css':
				return 'language-css';
			case 'json':
				return 'language-json';
			case 'bash':
			case 'shell':
				return 'language-bash';
			default:
				return 'language-text';
		}
	};

	return (
		<div className={`relative font-mono text-sm ${className}`}>
			<div className="absolute top-2 right-2 flex space-x-1">
				<button
					onClick={() => navigator.clipboard.writeText(value)}
					className="p-1 text-gray-400 hover:text-gray-600"
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
				{!readOnly && (
					<button
						onClick={() => {
							if (textareaRef.current) {
								textareaRef.current.select();
							}
						}}
						className="p-1 text-gray-400 hover:text-gray-600"
						aria-label="Select all"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
				)}
			</div>

			<div className="relative">
				<pre
					ref={preRef}
					className={`p-4 m-0 overflow-hidden whitespace-pre-wrap break-words invisible min-h-[100px] ${
						readOnly ? 'bg-gray-50' : 'bg-white'
					}`}
				/>
				<textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					readOnly={readOnly}
					className={`absolute inset-0 w-full h-full p-4 m-0 resize-none focus:outline-none ${
						readOnly
							? 'bg-gray-50 text-gray-700 cursor-default'
							: 'bg-white text-gray-900'
					} ${getLanguageClass()}`}
					style={{ caretColor: 'black' }}
				/>
			</div>

			{isFocused && !readOnly && (
				<div className="absolute bottom-2 left-2 text-xs text-gray-400">
					Tab: Indent, Shift+Tab: Unindent
				</div>
			)}
		</div>
	);
};

export default CodeEditor;
