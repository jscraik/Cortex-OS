'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

interface InterfaceSettingsProps {
	saveSettings: (settings: any) => void;
}

const InterfaceSettings: React.FC<InterfaceSettingsProps> = ({
	saveSettings,
}) => {
	const settings = useSettingsStore();
	const [loaded, setLoaded] = useState(false);

	// Interface settings state
	const [sidebarVisible, setSidebarVisible] = useState(true);
	const [sidebarWidth, setSidebarWidth] = useState(260);
	const [chatLayout, setChatLayout] = useState('standard');
	const [messageAlignment, setMessageAlignment] = useState('left');
	const [showTimestamps, setShowTimestamps] = useState(true);
	const [showScrollToBottom, setShowScrollToBottom] = useState(true);
	const [showModelIcon, setShowModelIcon] = useState(true);
	const [showUserIcon, setShowUserIcon] = useState(true);
	const [enableSyntaxHighlighting, setEnableSyntaxHighlighting] =
		useState(true);
	const [enableCodeCopyButton, setEnableCodeCopyButton] = useState(true);
	const [enableCodeExecution, setEnableCodeExecution] = useState(true);
	const [enableWebSearch, setEnableWebSearch] = useState(true);
	const [enableFileUpload, setEnableFileUpload] = useState(true);
	const [enableVoiceInput, setEnableVoiceInput] = useState(true);
	const [enableEmojiPicker, setEnableEmojiPicker] = useState(true);
	const [enableMarkdownRendering, setEnableMarkdownRendering] = useState(true);
	const [enableLaTeXRendering, setEnableLaTeXRendering] = useState(true);
	const [enableCodeBlockLineNumbers, setEnableCodeBlockLineNumbers] =
		useState(true);

	useEffect(() => {
		if (settings) {
			setSidebarVisible(settings?.interface?.sidebarVisible ?? true);
			setSidebarWidth(settings?.interface?.sidebarWidth ?? 260);
			setChatLayout(settings?.interface?.chatLayout ?? 'standard');
			setMessageAlignment(settings?.interface?.messageAlignment ?? 'left');
			setShowTimestamps(settings?.interface?.showTimestamps ?? true);
			setShowScrollToBottom(settings?.interface?.showScrollToBottom ?? true);
			setShowModelIcon(settings?.interface?.showModelIcon ?? true);
			setShowUserIcon(settings?.interface?.showUserIcon ?? true);
			setEnableSyntaxHighlighting(
				settings?.interface?.enableSyntaxHighlighting ?? true,
			);
			setEnableCodeCopyButton(
				settings?.interface?.enableCodeCopyButton ?? true,
			);
			setEnableCodeExecution(settings?.interface?.enableCodeExecution ?? true);
			setEnableWebSearch(settings?.interface?.enableWebSearch ?? true);
			setEnableFileUpload(settings?.interface?.enableFileUpload ?? true);
			setEnableVoiceInput(settings?.interface?.enableVoiceInput ?? true);
			setEnableEmojiPicker(settings?.interface?.enableEmojiPicker ?? true);
			setEnableMarkdownRendering(
				settings?.interface?.enableMarkdownRendering ?? true,
			);
			setEnableLaTeXRendering(
				settings?.interface?.enableLaTeXRendering ?? true,
			);
			setEnableCodeBlockLineNumbers(
				settings?.interface?.enableCodeBlockLineNumbers ?? true,
			);
			setLoaded(true);
		}
	}, [settings]);

	const handleSubmit = () => {
		saveSettings({
			interface: {
				sidebarVisible,
				sidebarWidth,
				chatLayout,
				messageAlignment,
				showTimestamps,
				showScrollToBottom,
				showModelIcon,
				showUserIcon,
				enableSyntaxHighlighting,
				enableCodeCopyButton,
				enableCodeExecution,
				enableWebSearch,
				enableFileUpload,
				enableVoiceInput,
				enableEmojiPicker,
				enableMarkdownRendering,
				enableLaTeXRendering,
				enableCodeBlockLineNumbers,
			},
		});
	};

	if (!loaded) {
		return <div>Loading...</div>;
	}

	return (
		<div
			id="tab-interface"
			className="flex flex-col h-full justify-between text-sm"
		>
			<div className="overflow-y-scroll max-h-[28rem] lg:max-h-full space-y-6">
				<div>
					<div className="text-base font-medium mb-3">Layout</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Show Sidebar</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Toggle visibility of the sidebar
								</div>
							</div>
							<button
								type="button"
								onClick={() => setSidebarVisible(!sidebarVisible)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									sidebarVisible
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										sidebarVisible ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div>
							<label
								htmlFor="sidebar-width"
								className="block text-sm font-medium mb-1"
							>
								Sidebar Width: {sidebarWidth}px
							</label>
							<input
								id="sidebar-width"
								type="range"
								min="200"
								max="400"
								value={sidebarWidth}
								onChange={(e) => setSidebarWidth(parseInt(e.target.value, 10))}
								className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
							/>
							<div className="flex justify-between text-xs text-gray-500 mt-1">
								<span>200px</span>
								<span>300px</span>
								<span>400px</span>
							</div>
						</div>

						<div>
							<label
								htmlFor="chat-layout"
								className="block text-sm font-medium mb-1"
							>
								Chat Layout
							</label>
							<select
								id="chat-layout"
								value={chatLayout}
								onChange={(e) => setChatLayout(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							>
								<option value="standard">Standard</option>
								<option value="bubble">Bubble</option>
								<option value="compact">Compact</option>
							</select>
						</div>

						<div>
							<label
								htmlFor="message-alignment"
								className="block text-sm font-medium mb-1"
							>
								Message Alignment
							</label>
							<select
								id="message-alignment"
								value={messageAlignment}
								onChange={(e) => setMessageAlignment(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							>
								<option value="left">Left</option>
								<option value="center">Center</option>
								<option value="right">Right</option>
							</select>
						</div>
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-3">Messages</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Show Timestamps</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Display timestamps on messages
								</div>
							</div>
							<button
								type="button"
								onClick={() => setShowTimestamps(!showTimestamps)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									showTimestamps
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										showTimestamps ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Show Scroll to Bottom</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Display scroll to bottom button
								</div>
							</div>
							<button
								type="button"
								onClick={() => setShowScrollToBottom(!showScrollToBottom)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									showScrollToBottom
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										showScrollToBottom ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Show Model Icon</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Display model icon in messages
								</div>
							</div>
							<button
								type="button"
								onClick={() => setShowModelIcon(!showModelIcon)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									showModelIcon ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										showModelIcon ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Show User Icon</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Display user icon in messages
								</div>
							</div>
							<button
								type="button"
								onClick={() => setShowUserIcon(!showUserIcon)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									showUserIcon ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										showUserIcon ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-3">Code Blocks</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Syntax Highlighting</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable syntax highlighting for code blocks
								</div>
							</div>
							<button
								type="button"
								onClick={() =>
									setEnableSyntaxHighlighting(!enableSyntaxHighlighting)
								}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									enableSyntaxHighlighting
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										enableSyntaxHighlighting ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Copy Button</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Show copy button on code blocks
								</div>
							</div>
							<button
								type="button"
								onClick={() => setEnableCodeCopyButton(!enableCodeCopyButton)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									enableCodeCopyButton
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										enableCodeCopyButton ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Line Numbers</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Show line numbers in code blocks
								</div>
							</div>
							<button
								type="button"
								onClick={() =>
									setEnableCodeBlockLineNumbers(!enableCodeBlockLineNumbers)
								}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									enableCodeBlockLineNumbers
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										enableCodeBlockLineNumbers
											? 'translate-x-6'
											: 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Code Execution</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable code execution in code blocks
								</div>
							</div>
							<button
								type="button"
								onClick={() => setEnableCodeExecution(!enableCodeExecution)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									enableCodeExecution
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										enableCodeExecution ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-3">Features</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Web Search</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable web search functionality
								</div>
							</div>
							<button
								type="button"
								onClick={() => setEnableWebSearch(!enableWebSearch)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									enableWebSearch
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										enableWebSearch ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">File Upload</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable file upload functionality
								</div>
							</div>
							<button
								type="button"
								onClick={() => setEnableFileUpload(!enableFileUpload)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									enableFileUpload
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										enableFileUpload ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Voice Input</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable voice input functionality
								</div>
							</div>
							<button
								type="button"
								onClick={() => setEnableVoiceInput(!enableVoiceInput)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									enableVoiceInput
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										enableVoiceInput ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Emoji Picker</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable emoji picker in chat input
								</div>
							</div>
							<button
								type="button"
								onClick={() => setEnableEmojiPicker(!enableEmojiPicker)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									enableEmojiPicker
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										enableEmojiPicker ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Markdown Rendering</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable markdown rendering in messages
								</div>
							</div>
							<button
								type="button"
								onClick={() =>
									setEnableMarkdownRendering(!enableMarkdownRendering)
								}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									enableMarkdownRendering
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										enableMarkdownRendering ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">LaTeX Rendering</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable LaTeX rendering in messages
								</div>
							</div>
							<button
								type="button"
								onClick={() => setEnableLaTeXRendering(!enableLaTeXRendering)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									enableLaTeXRendering
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										enableLaTeXRendering ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4 flex justify-end">
				<button
					type="button"
					onClick={handleSubmit}
					className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Save Changes
				</button>
			</div>
		</div>
	);
};

export default InterfaceSettings;
