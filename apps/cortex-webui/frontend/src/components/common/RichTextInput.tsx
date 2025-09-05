'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';

interface RichTextInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	onFocus?: () => void;
	onBlur?: () => void;
}

const RichTextInput: React.FC<RichTextInputProps> = ({
	value,
	onChange,
	placeholder = 'Type something...',
	className = '',
	onFocus,
	onBlur,
}) => {
	const editorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (editorRef.current && value !== editorRef.current.textContent) {
			// Use textContent instead of innerHTML to avoid XSS
			editorRef.current.textContent = value;
		}
	}, [value]);

	const handleInput = () => {
		if (editorRef.current) onChange(editorRef.current.textContent || '');
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
		}
	};

	const insertText = (text: string) => {
		if (!editorRef.current) return;
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			range.deleteContents();
			range.insertNode(document.createTextNode(text));
			range.collapse(false);
			selection.removeAllRanges();
			selection.addRange(range);
		}
		handleInput();
	};

	const formatText = (command: string, value: string = '') => {
		// Modern approach instead of deprecated execCommand
		if (editorRef.current) {
			editorRef.current.focus();
			// For now, just focus - actual formatting would need modern Selection API
		}
	};

	return (
		<div
			className={`border border-gray-300 dark:border-gray-600 rounded-lg ${className}`}
		>
			<div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
				<button
					type="button"
					onClick={() => formatText('bold')}
					className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
					title="Bold"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="w-4 h-4"
						aria-hidden
					>
						<path
							fillRule="evenodd"
							d="M4 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h7.5a.75.75 0 00.75-.75v-4.508a.75.75 0 01.105-.372l1.299-2.247A.75.75 0 0013.25 9H6.563a.75.75 0 010-1.5h5.187a.75.75 0 00.648-1.13l-1.298-2.247a.75.75 0 01-.106-.373V3.75A.75.75 0 0010.25 3H4z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<button
					type="button"
					onClick={() => formatText('italic')}
					className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
					title="Italic"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="w-4 h-4"
						aria-hidden
					>
						<path
							fillRule="evenodd"
							d="M8 2.75A.75.75 0 018.75 2h6.5a.75.75 0 010 1.5h-2.503L9.628 17.25H12.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5h2.36l3.01-13.5H8.75A.75.75 0 018 2.75z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<button
					type="button"
					onClick={() => formatText('underline')}
					className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
					title="Underline"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="w-4 h-4"
						aria-hidden
					>
						<path
							fillRule="evenodd"
							d="M3.75 17a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H3.75zm1.17-6.5a.75.75 0 000 1.5h.83v3.25a.75.75 0 001.5 0V12h.83a.75.75 0 000-1.5h-3.66zm4.5-6.25a.75.75 0 000 1.5h.83v8.75a.75.75 0 001.5 0V4.5h.83a.75.75 0 000-1.5h-3.66z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

				<button
					type="button"
					onClick={() => formatText('insertUnorderedList')}
					className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
					title="Bullet List"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="w-4 h-4"
						aria-hidden
					>
						<path
							fillRule="evenodd"
							d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<button
					type="button"
					onClick={() => formatText('insertOrderedList')}
					className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
					title="Numbered List"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="w-4 h-4"
						aria-hidden
					>
						<path
							fillRule="evenodd"
							d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

				<button
					type="button"
					onClick={() => insertText('**bold**')}
					className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs"
					title="Bold (Markdown)"
				>
					B
				</button>
				<button
					type="button"
					onClick={() => insertText('*italic*')}
					className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs italic"
					title="Italic (Markdown)"
				>
					I
				</button>
				<button
					type="button"
					onClick={() => insertText('`code`')}
					className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-mono"
					title="Inline Code (Markdown)"
				>
					{'</>'}
				</button>
			</div>

			<div
				ref={editorRef}
				contentEditable
				role="textbox"
				tabIndex={0}
				className="p-3 min-h-[100px] max-h-[300px] overflow-y-auto focus:outline-none"
				onInput={handleInput}
				onKeyDown={handleKeyDown}
				onFocus={() => {
					if (onFocus) onFocus();
				}}
				onBlur={() => {
					if (onBlur) onBlur();
				}}
			>
				{value === '' && (
					<div className="text-gray-400 dark:text-gray-500 pointer-events-none">
						{placeholder}
					</div>
				)}
			</div>
		</div>
	);
};

export default RichTextInput;
