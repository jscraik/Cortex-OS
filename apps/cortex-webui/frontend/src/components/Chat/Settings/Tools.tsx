'use client';
// Helper to compute new languages array
function toggleLanguage(existing: string[] | undefined, lang: string, add: boolean): string[] {
	const base = Array.isArray(existing) ? existing : [];
	if (add) {
		return base.includes(lang) ? base : [...base, lang];
	}
	return base.filter((l) => l !== lang);
}

import type React from 'react';
import { useEffect, useId, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

interface ToolConfigMap {
	searchEngine?: string;
	resultsLimit?: number;
	languages?: string[];
	timeout?: number;
	model?: string;
	size?: string;
}

interface Tool {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	config?: ToolConfigMap;
}

interface ToolsSettingsProps {
	saveSettings: (settings: Record<string, unknown>) => void;
}

const ToolsSettings: React.FC<ToolsSettingsProps> = ({ saveSettings }) => {
	const settings = useSettingsStore() as unknown as { tools?: Tool[] } & Record<string, unknown>;
	const [loaded, setLoaded] = useState(false);

	// Generate unique ID for tab
	const tabId = useId();

	// Tools settings state
	const [tools, setTools] = useState<Tool[]>([
		{
			id: 'web-search',
			name: 'Web Search',
			description: 'Enable web search capabilities',
			enabled: true,
		},
		{
			id: 'code-interpreter',
			name: 'Code Interpreter',
			description: 'Execute code snippets',
			enabled: true,
		},
		{
			id: 'image-generator',
			name: 'Image Generator',
			description: 'Generate images from text descriptions',
			enabled: true,
		},
		{
			id: 'document-analyzer',
			name: 'Document Analyzer',
			description: 'Analyze and extract information from documents',
			enabled: true,
		},
		{
			id: 'data-visualizer',
			name: 'Data Visualizer',
			description: 'Create charts and graphs from data',
			enabled: true,
		},
	]);

	const [showToolConfig, setShowToolConfig] = useState<string | null>(null);

	useEffect(() => {
		if (settings) {
			// Load tools from settings if available
			if (settings?.tools) {
				setTools(settings.tools);
			}
			setLoaded(true);
		}
	}, [settings]);

	const handleSubmit = () => {
		saveSettings({
			tools,
		});
	};

	const toggleTool = (toolId: string) => {
		setTools(
			tools.map((tool) => (tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool)),
		);
	};

	const updateToolConfig = (toolId: string, config: Record<string, unknown>) => {
		setTools(tools.map((tool) => (tool.id === toolId ? { ...tool, config } : tool)));
	};

	// Helper renderer to avoid deep nesting inside JSX
	const renderLanguageCheckboxes = (tool: Tool) => {
		return ['python', 'javascript', 'bash'].map((lang) => {
			const checked = Array.isArray(tool.config?.languages) && tool.config.languages.includes(lang);
			const existing = Array.isArray(tool.config?.languages) ? tool.config.languages : [];
			const onToggle = (isChecked: boolean) => {
				updateToolConfig(tool.id, {
					...tool.config,
					languages: toggleLanguage(existing, lang, isChecked),
				});
			};
			return (
				<label key={lang} className="flex items-center text-xs">
					<input
						type="checkbox"
						checked={checked}
						onChange={(e) => onToggle(e.target.checked)}
						className="mr-1 rounded"
					/>
					{lang}
				</label>
			);
		});
	};

	if (!loaded) {
		return <div>Loading...</div>;
	}

	return (
		<div id={tabId} className="flex flex-col h-full justify-between text-sm">
			<div className="overflow-y-scroll max-h-[28rem] lg:max-h-full space-y-6">
				<div>
					<div className="text-base font-medium mb-3">Available Tools</div>
					<div className="text-xs text-gray-500 mb-4">
						Enable or disable tools that can be used with AI models. Configure each tool according
						to your needs.
					</div>

					<div className="space-y-4">
						{tools.map((tool) => (
							<div
								key={tool.id}
								className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="font-medium">{tool.name}</div>
										<div className="text-xs text-gray-500 mt-1">{tool.description}</div>
									</div>
									<button
										type="button"
										onClick={() => toggleTool(tool.id)}
										className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
											tool.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
										}`}
									>
										<span
											className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
												tool.enabled ? 'translate-x-6' : 'translate-x-1'
											}`}
										/>
									</button>
								</div>

								{tool.enabled && (
									<div className="mt-3 flex space-x-2">
										<button
											type="button"
											onClick={() => setShowToolConfig(showToolConfig === tool.id ? null : tool.id)}
											className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
										>
											{showToolConfig === tool.id ? 'Hide' : 'Configure'}
										</button>
									</div>
								)}

								{showToolConfig === tool.id && tool.enabled && (
									<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
										<div className="font-medium mb-2">Configuration</div>
										{tool.id === 'web-search' && (
											<div className="space-y-3">
												<div>
													{(() => {
														const selectId = `${tool.id}-search-engine`;
														return (
															<>
																<label
																	htmlFor={selectId}
																	className="block text-xs font-medium mb-1"
																>
																	Search Engine
																</label>
																<select
																	id={selectId}
																	value={tool.config?.searchEngine ?? 'google'}
																	onChange={(e) =>
																		updateToolConfig(tool.id, {
																			...tool.config,
																			searchEngine: e.target.value,
																		})
																	}
																	className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
																>
																	<option value="google">Google</option>
																	<option value="bing">Bing</option>
																	<option value="duckduckgo">DuckDuckGo</option>
																</select>
															</>
														);
													})()}
												</div>
												<div>
													{(() => {
														const inputId = `${tool.id}-results-limit`;
														return (
															<>
																<label htmlFor={inputId} className="block text-xs font-medium mb-1">
																	Results Limit
																</label>
																<input
																	id={inputId}
																	type="number"
																	min="1"
																	max="20"
																	value={tool.config?.resultsLimit ?? 5}
																	onChange={(e) =>
																		updateToolConfig(tool.id, {
																			...tool.config,
																			resultsLimit: parseInt(e.target.value, 10),
																		})
																	}
																	className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
																/>
															</>
														);
													})()}
												</div>
											</div>
										)}

										{tool.id === 'code-interpreter' && (
											<div className="space-y-3">
												<div>
													<fieldset className="flex flex-wrap gap-2">
														<legend className="sr-only">Supported Languages</legend>
														{renderLanguageCheckboxes(tool)}
													</fieldset>
												</div>
												<div>
													{(() => {
														const timeoutId = `${tool.id}-timeout`;
														return (
															<>
																<label
																	htmlFor={timeoutId}
																	className="block text-xs font-medium mb-1"
																>
																	Timeout (seconds)
																</label>
																<input
																	id={timeoutId}
																	type="number"
																	min="1"
																	max="300"
																	value={tool.config?.timeout ?? 30}
																	onChange={(e) =>
																		updateToolConfig(tool.id, {
																			...tool.config,
																			timeout: parseInt(e.target.value, 10),
																		})
																	}
																	className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
																/>
															</>
														);
													})()}
												</div>
											</div>
										)}

										{tool.id === 'image-generator' && (
											<div className="space-y-3">
												<div>
													{(() => {
														const modelId = `${tool.id}-model`;
														return (
															<>
																<label htmlFor={modelId} className="block text-xs font-medium mb-1">
																	Default Model
																</label>
																<select
																	id={modelId}
																	value={tool.config?.model ?? 'dall-e-3'}
																	onChange={(e) =>
																		updateToolConfig(tool.id, {
																			...tool.config,
																			model: e.target.value,
																		})
																	}
																	className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
																>
																	<option value="dall-e-3">DALL-E 3</option>
																	<option value="dall-e-2">DALL-E 2</option>
																	<option value="stable-diffusion">Stable Diffusion</option>
																</select>
															</>
														);
													})()}
												</div>
												<div>
													{(() => {
														const sizeId = `${tool.id}-size`;
														return (
															<>
																<label htmlFor={sizeId} className="block text-xs font-medium mb-1">
																	Image Size
																</label>
																<select
																	id={sizeId}
																	value={tool.config?.size ?? '1024x1024'}
																	onChange={(e) =>
																		updateToolConfig(tool.id, {
																			...tool.config,
																			size: e.target.value,
																		})
																	}
																	className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
																>
																	<option value="256x256">256x256</option>
																	<option value="512x512">512x512</option>
																	<option value="1024x1024">1024x1024</option>
																</select>
															</>
														);
													})()}
												</div>
											</div>
										)}

										{!['web-search', 'code-interpreter', 'image-generator'].includes(tool.id) && (
											<div className="text-xs text-gray-500">
												No specific configuration options available for this tool.
											</div>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-3">Tool Permissions</div>
					<div className="text-xs text-gray-500 mb-4">
						Control what tools can access on your system.
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">File System Access</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Allow tools to read and write files
								</div>
							</div>
							<button
								type="button"
								className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-gray-600 transition-colors focus:outline-none"
							>
								<span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Network Access</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Allow tools to access the internet
								</div>
							</div>
							<button
								type="button"
								className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none"
							>
								<span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Camera Access</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Allow tools to access your camera
								</div>
							</div>
							<button
								type="button"
								className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-gray-600 transition-colors focus:outline-none"
							>
								<span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Microphone Access</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Allow tools to access your microphone
								</div>
							</div>
							<button
								type="button"
								className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-gray-600 transition-colors focus:outline-none"
							>
								<span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
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

export default ToolsSettings;
