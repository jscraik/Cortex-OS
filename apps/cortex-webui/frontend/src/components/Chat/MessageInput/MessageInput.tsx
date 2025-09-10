'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import InputVariablesModal from './InputVariablesModal';
import VoiceRecording from './VoiceRecording';

interface MessageInputProps {
	onSendMessage: (content: string) => void;
	disabled: boolean;
	placeholder?: string;
	files?: File[];
	setFiles?: React.Dispatch<React.SetStateAction<File[]>>;
	webSearchEnabled?: boolean;
	setWebSearchEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
	imageGenerationEnabled?: boolean;
	setImageGenerationEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
	codeInterpreterEnabled?: boolean;
	setCodeInterpreterEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
	lastUserMessage?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
	onSendMessage,
	disabled,
	placeholder = 'Type a message...',
	files = [],
	setFiles = () => {},
	webSearchEnabled = false,
	setWebSearchEnabled = () => {},
	imageGenerationEnabled = false,
	setImageGenerationEnabled = () => {},
	codeInterpreterEnabled = false,
	setCodeInterpreterEnabled = () => {},
	lastUserMessage,
}) => {
	const [input, setInput] = useState('');
	const [messageHistory, setMessageHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [isRecording, setIsRecording] = useState(false);
	const [showVoiceRecording, setShowVoiceRecording] = useState(false);
	const [showInputVariablesModal, setShowInputVariablesModal] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const [fileProcessing, setFileProcessing] = useState<string[]>([]);
	const [inputVariables, setInputVariables] = useState<{
		[key: string]: string;
	}>({});
	const [inputVariableValues, setInputVariableValues] = useState<{
		[key: string]: string;
	}>({});
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const dragCounterRef = useRef(0);

	// Handle drag and drop
	const handleDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current++;
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current--;
		if (dragCounterRef.current === 0) {
			setIsDragOver(false);
		}
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const processDocument = async (file: File): Promise<string | null> => {
		setFileProcessing((prev) => [...prev, file.name]);

		try {
			const formData = new FormData();
			formData.append('document', file);

			const response = await fetch('/api/documents/parse', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`Failed to process document: ${response.statusText}`);
			}

			const result = await response.json();

			// Format the document content for insertion
			let processedContent = `**Document: ${file.name}**\n\n`;
			if (result.metadata?.pageCount) {
				processedContent += `*Pages: ${result.metadata.pageCount}*\n\n`;
			}
			processedContent +=
				result.text || '[Document processed but no text extracted]';

			return processedContent;
		} catch (error) {
			console.error('Error processing document:', error);
			return `**Error processing ${file.name}**: ${error instanceof Error ? error.message : 'Unknown error'}`;
		} finally {
			setFileProcessing((prev) => prev.filter((name) => name !== file.name));
		}
	};

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(false);
			dragCounterRef.current = 0;

			const droppedFiles = Array.from(e.dataTransfer.files);
			if (droppedFiles.length === 0) return;

			// Separate files that can be processed as documents vs regular file attachments
			const documentFiles = droppedFiles.filter(
				(file) =>
					file.type === 'application/pdf' ||
					file.type === 'text/plain' ||
					file.type.startsWith('image/'),
			);

			const regularFiles = droppedFiles.filter(
				(file) => !documentFiles.includes(file),
			);

			// Add regular files to attachments
			if (regularFiles.length > 0) {
				setFiles((prev) => [...prev, ...regularFiles]);
			}

			// Process document files and insert their content into the input
			if (documentFiles.length > 0) {
				let combinedContent = input;

				for (const file of documentFiles) {
					const processedContent = await processDocument(file);
					if (processedContent) {
						combinedContent +=
							(combinedContent ? '\n\n' : '') + processedContent;
					}
				}

				setInput(combinedContent);
			}
		},
		[input, setFiles],
	);

	const getFileIcon = (file: File) => {
		if (file.type.startsWith('image/')) {
			return (
				<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fillRule="evenodd"
						d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
						clipRule="evenodd"
					/>
				</svg>
			);
		}
		if (file.type === 'application/pdf') {
			return (
				<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fillRule="evenodd"
						d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
						clipRule="evenodd"
					/>
				</svg>
			);
		}
		return (
			<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
				<path
					fillRule="evenodd"
					d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
					clipRule="evenodd"
				/>
			</svg>
		);
	};
	const adjustTextareaHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = 'auto';
			const maxHeight = 200; // Max height in pixels
			textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
		}
	}, []);

	// Adjust height when input changes
	useEffect(() => {
		adjustTextareaHeight();
	}, [input, adjustTextareaHeight]);

	// Add message to history when sent
	const addToHistory = useCallback((message: string) => {
		setMessageHistory((prev) => {
			const newHistory = [
				message,
				...prev.filter((msg) => msg !== message),
			].slice(0, 10); // Keep last 10
			return newHistory;
		});
		setHistoryIndex(-1);
	}, []);

	const clearInput = useCallback(() => {
		setInput('');
		setHistoryIndex(-1);
		textareaRef.current?.focus();
	}, []);

	const recallLastMessage = useCallback(() => {
		if (lastUserMessage) {
			setInput(lastUserMessage);
			setHistoryIndex(-1);
			// Move cursor to end
			setTimeout(() => {
				const textarea = textareaRef.current;
				if (textarea) {
					textarea.selectionStart = textarea.selectionEnd =
						textarea.value.length;
				}
			}, 0);
		}
	}, [lastUserMessage]);

	const navigateHistory = useCallback(
		(direction: 'up' | 'down') => {
			if (messageHistory.length === 0) return;

			if (direction === 'up') {
				const newIndex =
					historyIndex < messageHistory.length - 1
						? historyIndex + 1
						: historyIndex;
				setHistoryIndex(newIndex);
				setInput(messageHistory[newIndex] || '');
			} else {
				const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
				setHistoryIndex(newIndex);
				setInput(newIndex >= 0 ? messageHistory[newIndex] : '');
			}
		},
		[messageHistory, historyIndex],
	);

	// Extract input variables from text
	const extractInputVariables = (text: string) => {
		const variableRegex = /\{\{(\w+)\}\}/g;
		const variables: { [key: string]: string } = {};
		let match: RegExpExecArray | null = variableRegex.exec(text);
		while (match) {
			const variableName = match[1];
			if (!variables[variableName]) {
				variables[variableName] = ''; // Empty description for now
			}
			match = variableRegex.exec(text);
		}

		return variables;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Check for input variables
		const variables = extractInputVariables(input);
		if (
			Object.keys(variables).length > 0 &&
			Object.keys(inputVariableValues).length === 0
		) {
			setInputVariables(variables);
			setShowInputVariablesModal(true);
			return;
		}

		// Replace variables with values
		let finalInput = input;
		Object.keys(inputVariableValues).forEach((key) => {
			finalInput = finalInput.replace(
				new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
				inputVariableValues[key],
			);
		});

		if (finalInput.trim() && !disabled) {
			onSendMessage(finalInput.trim());
			addToHistory(finalInput.trim());
			setInput('');
			setFiles([]);
			setInputVariableValues({});
			setHistoryIndex(-1);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Send message: Enter (but not Shift+Enter)
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e as unknown as React.FormEvent);
			return;
		}

		// Clear input: Ctrl/Cmd + L
		if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
			e.preventDefault();
			clearInput();
			return;
		}

		// Recall last message: Ctrl/Cmd + R
		if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
			e.preventDefault();
			recallLastMessage();
			return;
		}

		// Navigate message history: Arrow Up/Down (when at start/end of textarea)
		const textarea = e.currentTarget;
		const atStart = textarea.selectionStart === 0;
		const atEnd = textarea.selectionStart === textarea.value.length;
		const isEmpty = textarea.value.trim() === '';

		if (e.key === 'ArrowUp' && (atStart || isEmpty)) {
			e.preventDefault();
			navigateHistory('up');
			return;
		}

		if (e.key === 'ArrowDown' && (atEnd || isEmpty)) {
			e.preventDefault();
			navigateHistory('down');
			return;
		}

		// Escape: Blur textarea
		if (e.key === 'Escape') {
			textarea.blur();
			return;
		}

		// Handle special commands (future feature)
		if (e.key === '/' && input === '') {
			// Future: show commands palette
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
		// Reset history navigation when user types
		if (historyIndex !== -1) {
			setHistoryIndex(-1);
		}
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const newFiles = Array.from(e.target.files);

			// Separate files that can be processed as documents vs regular file attachments
			const documentFiles = newFiles.filter(
				(file) =>
					file.type === 'application/pdf' ||
					file.type === 'text/plain' ||
					file.type.startsWith('image/'),
			);

			const regularFiles = newFiles.filter(
				(file) => !documentFiles.includes(file),
			);

			// Add regular files to attachments
			if (regularFiles.length > 0) {
				setFiles((prev) => [...prev, ...regularFiles]);
			}

			// Process document files and insert their content into the input
			if (documentFiles.length > 0) {
				let combinedContent = input;

				for (const file of documentFiles) {
					const processedContent = await processDocument(file);
					if (processedContent) {
						combinedContent +=
							(combinedContent ? '\n\n' : '') + processedContent;
					}
				}

				setInput(combinedContent);
			}

			// Clear the input to allow selecting the same files again
			e.target.value = '';
		}
	};

	const removeFile = (index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const handlePaste = (e: React.ClipboardEvent) => {
		if (e.clipboardData.files.length > 0) {
			const newFiles = Array.from(e.clipboardData.files);
			setFiles((prev) => [...prev, ...newFiles]);
		}
	};

	const toggleWebSearch = () => {
		setWebSearchEnabled((prev) => !prev);
	};

	const toggleImageGeneration = () => {
		setImageGenerationEnabled((prev) => !prev);
	};

	const toggleCodeInterpreter = () => {
		setCodeInterpreterEnabled((prev) => !prev);
	};

	const handleVoiceRecordingComplete = (_audioBlob: Blob) => {
		// In a real implementation, we would send this audio to a transcription service
		// For now, we'll just add a placeholder message
		setInput('[Audio message recorded]');
		setShowVoiceRecording(false);
		setIsRecording(false);
	};

	const handleVoiceRecordingCancel = () => {
		setShowVoiceRecording(false);
		setIsRecording(false);
	};

	const handleInputVariablesSubmit = (values: { [key: string]: string }) => {
		setInputVariableValues(values);
		setShowInputVariablesModal(false);

		// Submit the message with replaced variables
		let finalInput = input;
		Object.keys(values).forEach((key) => {
			finalInput = finalInput.replace(
				new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
				values[key],
			);
		});

		if (finalInput.trim() && !disabled) {
			onSendMessage(finalInput.trim());
			addToHistory(finalInput.trim());
			setInput('');
			setFiles([]);
			setHistoryIndex(-1);
		}
	};

	const handleInputVariablesCancel = () => {
		setShowInputVariablesModal(false);
	};

	// Handle special text replacements
	useEffect(() => {
		const handleTextReplacements = async () => {
			let newText = input;

			// Handle clipboard variable
			if (input.includes('{{CLIPBOARD}}')) {
				try {
					const clipboardText = await navigator.clipboard.readText();
					newText = newText.replace(/\{\{CLIPBOARD\}\}/g, clipboardText);
				} catch (error) {
					// eslint-disable-next-line no-console
					console.warn('Could not read clipboard:', error);
				}
			}

			// Handle current date/time variables
			const now = new Date();
			newText = newText
				.replace(/\{\{DATE\}\}/g, now.toLocaleDateString())
				.replace(/\{\{TIME\}\}/g, now.toLocaleTimeString())
				.replace(/\{\{DATETIME\}\}/g, now.toLocaleString());

			if (newText !== input) {
				setInput(newText);
			}
		};

		// Only process replacements when input changes and doesn't already contain variables
		if (input && !showInputVariablesModal) {
			handleTextReplacements();
		}
	}, [input, showInputVariablesModal]);

	// Character count
	const charCount = input.length;
	const isNearLimit = charCount > 3000; // Warn when approaching typical token limits

	return (
		<>
			<form
				onSubmit={handleSubmit}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				className={`flex flex-col gap-2 p-4 border-t ${
					isDragOver
						? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
						: ''
				}`}
			>
				{/* Character count indicator */}
				{isNearLimit && (
					<div className="text-xs text-amber-600 dark:text-amber-400 self-end">
						{charCount} characters
					</div>
				)}

				{/* File attachments */}
				{files.length > 0 && (
					<div className="flex flex-wrap gap-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
						<div className="w-full text-xs text-gray-600 dark:text-gray-400 mb-2">
							Attached files ({files.length})
						</div>
						{files.map((file, index) => (
							<div
								key={`${file.name}-${index}`}
								className="flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 shadow-sm"
							>
								<div className="text-gray-500 dark:text-gray-400">
									{getFileIcon(file)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">
										{file.name}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										{(file.size / 1024).toFixed(1)} KB
									</div>
								</div>
								{fileProcessing.includes(file.name) ? (
									<div className="animate-spin h-4 w-4 text-blue-500">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
												className="opacity-25"
											></circle>
											<path
												fill="currentColor"
												d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												className="opacity-75"
											></path>
										</svg>
									</div>
								) : (
									<button
										type="button"
										onClick={() => removeFile(index)}
										className="text-gray-400 hover:text-red-500 transition-colors"
										aria-label="Remove file"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
												clipRule="evenodd"
											/>
										</svg>
									</button>
								)}
							</div>
						))}
					</div>
				)}

				{/* File processing indicator */}
				{fileProcessing.length > 0 && (
					<div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
						<div className="animate-spin h-4 w-4 text-blue-500">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
									className="opacity-25"
								></circle>
								<path
									fill="currentColor"
									d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									className="opacity-75"
								></path>
							</svg>
						</div>
						<span className="text-sm text-blue-700 dark:text-blue-300">
							Processing {fileProcessing.length} document
							{fileProcessing.length > 1 ? 's' : ''}...
						</span>
					</div>
				)}

				{/* Drag and drop indicator */}
				{isDragOver && (
					<div className="border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg p-8 text-center bg-blue-50 dark:bg-blue-900/20">
						<div className="text-blue-600 dark:text-blue-400 mb-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-12 w-12 mx-auto"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
								/>
							</svg>
						</div>
						<p className="text-blue-700 dark:text-blue-300 font-medium">
							Drop files here to upload
						</p>
						<p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
							Documents will be processed and text extracted automatically
						</p>
					</div>
				)}

				{/* Tools bar */}
				<div className="flex gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={disabled}
						className="flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
						aria-label="Attach files"
						title="Upload files - PDFs and documents will be processed automatically"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<title>Attach files</title>
							<path
								fillRule="evenodd"
								d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
								clipRule="evenodd"
							/>
						</svg>
						<span>Files</span>
						{fileProcessing.length > 0 && (
							<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
						)}
					</button>

					<button
						type="button"
						onClick={toggleWebSearch}
						disabled={disabled}
						className={`flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 ${
							webSearchEnabled
								? 'bg-blue-100 dark:bg-blue-900 border-blue-500'
								: ''
						}`}
						aria-label="Web search"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<title>Toggle web search</title>
							<path
								fillRule="evenodd"
								d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
								clipRule="evenodd"
							/>
						</svg>
						<span>Web</span>
					</button>

					<button
						type="button"
						onClick={toggleImageGeneration}
						disabled={disabled}
						className={`flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 ${
							imageGenerationEnabled
								? 'bg-blue-100 dark:bg-blue-900 border-blue-500'
								: ''
						}`}
						aria-label="Image generation"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<title>Toggle image generation</title>
							<path
								fillRule="evenodd"
								d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
								clipRule="evenodd"
							/>
						</svg>
						<span>Image</span>
					</button>

					<button
						type="button"
						onClick={toggleCodeInterpreter}
						disabled={disabled}
						className={`flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 ${
							codeInterpreterEnabled
								? 'bg-blue-100 dark:bg-blue-900 border-blue-500'
								: ''
						}`}
						aria-label="Code interpreter"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<title>Toggle code interpreter</title>
							<path
								fillRule="evenodd"
								d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
								clipRule="evenodd"
							/>
						</svg>
						<span>Code</span>
					</button>

					<button
						type="button"
						onClick={() => setShowVoiceRecording(true)}
						disabled={disabled}
						className={`flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 ${
							isRecording
								? 'bg-red-100 dark:bg-red-900 border-red-500 animate-pulse'
								: ''
						}`}
						aria-label="Voice recording"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<title>Start voice recording</title>
							<path
								fillRule="evenodd"
								d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
								clipRule="evenodd"
							/>
						</svg>
						<span>Voice</span>
					</button>
				</div>

				<div className="flex gap-2 relative">
					<textarea
						ref={textareaRef}
						value={input}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						onPaste={handlePaste}
						disabled={disabled}
						className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-3 pr-12 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 min-h-[44px]"
						placeholder={placeholder}
						rows={1}
					/>

					{/* Keyboard shortcut hints (show on focus) */}
					<div className="absolute bottom-1 right-14 text-xs text-gray-400 dark:text-gray-500 pointer-events-none opacity-0 focus-within:opacity-100 transition-opacity">
						⏎ Send • ⇧⏎ New line
					</div>

					<button
						type="submit"
						disabled={disabled || (!input.trim() && files.length === 0)}
						className="self-end bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg px-4 py-2 h-11 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						title="Send message (Enter)"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="22" y1="2" x2="11" y2="13"></line>
							<polygon points="22,2 15,22 11,13 2,9"></polygon>
						</svg>
					</button>
				</div>

				{/* Keyboard shortcuts help */}
				<div className="text-xs text-gray-500 dark:text-gray-400 space-x-4">
					<span>
						<kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
							Ctrl+L
						</kbd>{' '}
						Clear
					</span>
					<span>
						<kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
							Ctrl+R
						</kbd>{' '}
						Recall last
					</span>
					<span>
						<kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
							↑↓
						</kbd>{' '}
						History
					</span>
					<span>
						<kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
							Esc
						</kbd>{' '}
						Unfocus
					</span>
				</div>

				{/* Hidden file input paired with the visible "Files" button via aria-controls and label */}
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleFileUpload}
					className="hidden"
					multiple
					accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,image/*,text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					aria-label="Choose files to attach"
				/>
			</form>

			{showVoiceRecording && (
				<VoiceRecording
					onRecordingComplete={handleVoiceRecordingComplete}
					onCancel={handleVoiceRecordingCancel}
				/>
			)}

			{showInputVariablesModal && (
				<InputVariablesModal
					variables={inputVariables}
					onSubmit={handleInputVariablesSubmit}
					onCancel={handleInputVariablesCancel}
				/>
			)}
		</>
	);
};

export default MessageInput;
