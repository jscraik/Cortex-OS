'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import Dropdown from '../../common/Dropdown';
import Spinner from '../../common/Spinner';
import Switch from '../../common/Switch';
import Tooltip from '../../common/Tooltip';

interface Tool {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
}

interface InputMenuProps {
	selectedToolIds: string[];
	selectedModels: string[];
	fileUploadCapableModels: string[];
	screenCaptureHandler: () => void;
	uploadFilesHandler: () => void;
	inputFilesHandler: (files: File[]) => void;
	uploadGoogleDriveHandler: () => void;
	uploadOneDriveHandler: (type: string) => void;
	onClose: () => void;
	children: React.ReactNode;
}

const InputMenu: React.FC<InputMenuProps> = ({
	selectedToolIds = [],
	selectedModels = [],
	fileUploadCapableModels = [],
	screenCaptureHandler,
	uploadFilesHandler,
	inputFilesHandler,
	uploadGoogleDriveHandler,
	uploadOneDriveHandler,
	onClose,
	children,
}) => {
	const [show, setShow] = useState(false);
	const [tools, setTools] = useState<Record<string, Tool> | null>(null);
	const [_activeToolIds, setActiveToolIds] =
		useState<string[]>(selectedToolIds);
	const [showAllTools, setShowAllTools] = useState(false);
	const [fileUploadEnabled, setFileUploadEnabled] = useState(true);
	const cameraInputRef = useRef<HTMLInputElement>(null);

	// Check if file upload is enabled
	useEffect(() => {
		const enabled = fileUploadCapableModels.length === selectedModels.length; // &&
		// (user?.role === 'admin' || user?.permissions?.chat?.file_upload);

		setFileUploadEnabled(enabled);
	}, [fileUploadCapableModels, selectedModels]);

	// Initialize tools - in a real implementation, you would fetch tools from an API
	useEffect(() => {
		if (show) {
			// Mock tools data - in a real implementation, this would come from an API
			const mockTools: Record<string, Tool> = {
				'tool-1': {
					id: 'tool-1',
					name: 'Web Search',
					description: 'Search the web for information',
					enabled: selectedToolIds.includes('tool-1'),
				},
				'tool-2': {
					id: 'tool-2',
					name: 'Code Interpreter',
					description: 'Execute code snippets',
					enabled: selectedToolIds.includes('tool-2'),
				},
				'tool-3': {
					id: 'tool-3',
					name: 'Image Generator',
					description: 'Generate images from text descriptions',
					enabled: selectedToolIds.includes('tool-3'),
				},
				'tool-4': {
					id: 'tool-4',
					name: 'Document Analyzer',
					description: 'Analyze and extract information from documents',
					enabled: selectedToolIds.includes('tool-4'),
				},
			};

			setTools(mockTools);
		}
	}, [show, selectedToolIds]);

	// Handle file change for camera input
	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target?.files || []);
		if (files.length > 0) {
			inputFilesHandler(files);
		}
	};

	// Detect mobile device
	// Basic mobile detection; vendor/opera fallbacks removed for simplicity
	const detectMobile = () =>
		/android|iphone|ipad|ipod|windows phone/i.test(navigator.userAgent);

	// Toggle tool enabled state & maintain local active selection list (avoid prop reassignment)
	const toggleTool = (toolId: string, explicit?: boolean) => {
		if (!tools) return;
		setTools((prev) => ({
			...prev,
			[toolId]: {
				...prev[toolId],
				enabled: explicit !== undefined ? explicit : !prev[toolId].enabled,
			},
		}));
		setActiveToolIds((prev) => {
			const shouldEnable =
				explicit !== undefined ? explicit : !prev.includes(toolId);
			if (shouldEnable && !prev.includes(toolId)) return [...prev, toolId];
			if (!shouldEnable) return prev.filter((id) => id !== toolId);
			return prev;
		});
	};

	// Derived tooltip text for file upload state
	const fileUploadTooltip = () => {
		if (fileUploadCapableModels.length !== selectedModels.length) {
			return 'Model(s) do not support file upload';
		}
		if (!fileUploadEnabled) {
			return 'You do not have permission to upload files.';
		}
		return '';
	};

	return (
		<>
			{/* Hidden file input used to open the camera on mobile */}
			<input
				ref={cameraInputRef}
				id="camera-input"
				type="file"
				accept="image/*"
				capture="environment"
				onChange={handleFileChange}
				style={{ display: 'none' }}
			/>

			<Dropdown
				show={show}
				onShowChange={(newShow) => {
					setShow(newShow);
					if (!newShow) {
						onClose();
					}
				}}
			>
				<Tooltip content="More">{children}</Tooltip>

				<div slot="content">
					<div
						className="w-full max-w-[240px] rounded-xl px-1 py-1 border border-gray-300/30 dark:border-gray-700/50 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-sm"
						style={{
							position: 'absolute',
							bottom: 'calc(100% + 10px)',
							left: '0',
							transform: 'translateX(-8px)',
							minWidth: '200px',
						}}
					>
						{tools ? (
							Object.keys(tools).length > 0 && (
								<>
									<div
										className={`${showAllTools ? 'max-h-96' : 'max-h-28'} overflow-y-auto scrollbar-thin`}
									>
										{Object.keys(tools).map((toolId) => {
											const tool = tools[toolId];
											return (
												<div key={toolId} className="w-full">
													<button
														type="button"
														className="flex w-full justify-between gap-2 items-center px-3 py-2 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
														onClick={() => toggleTool(toolId)}
														aria-pressed={tool.enabled}
													>
														<div className="flex-1 truncate">
															<Tooltip
																content={tool?.description ?? ''}
																placement="top-start"
																className="flex flex-1 gap-2 items-center"
															>
																<div className="shrink-0" aria-hidden="true">
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		viewBox="0 0 24 24"
																		fill="currentColor"
																		className="w-5 h-5"
																	>
																		<title>{tool.name} icon</title>
																		<path
																			fillRule="evenodd"
																			d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 0 0 4.25 22.5h15.5a1.875 1.875 0 0 0 1.865-2.071l-1.263-12a1.875 1.875 0 0 0-1.865-1.679H16.5V6a4.5 4.5 0 1 0-9 0ZM12 3a3 3 0 0 0-3 3v.75h6V6a3 3 0 0 0-3-3Zm-3 8.25a3 3 0 1 0 6 0v-.75a.75.75 0 0 1 1.5 0v.75a4.5 4.5 0 1 1-9 0v-.75a.75.75 0 0 1 1.5 0v.75Z"
																			clipRule="evenodd"
																		/>
																	</svg>
																</div>
																<div className="truncate">{tool.name}</div>
															</Tooltip>
														</div>
														<div className="shrink-0">
															<Switch
																checked={tool.enabled}
																onChange={(checked) =>
																	toggleTool(toolId, checked)
																}
															/>
														</div>
													</button>
												</div>
											);
										})}
									</div>
									{Object.keys(tools).length > 3 && (
										<button
											type="button"
											className="flex w-full justify-center items-center text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
											onClick={() => setShowAllTools(!showAllTools)}
											aria-expanded={showAllTools}
											aria-label={
												showAllTools ? 'Show fewer tools' : 'Show all tools'
											}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={2.5}
												stroke="currentColor"
												className={`size-3 transition-transform duration-200 ${
													showAllTools ? 'rotate-180' : ''
												} text-gray-300 dark:text-gray-600`}
												aria-hidden="true"
											>
												<title>Toggle tool list length</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="m19.5 8.25-7.5 7.5-7.5-7.5"
												></path>
											</svg>
										</button>
									)}
									<hr className="border-black/5 dark:border-white/5 my-1" />
								</>
							)
						) : (
							<div className="py-4">
								<Spinner />
							</div>
						)}

						<Tooltip content={fileUploadTooltip()} className="w-full">
							<div
								className={`flex gap-2 items-center px-3 py-2 text-sm font-medium rounded-xl ${!fileUploadEnabled ? 'opacity-50' : ''}`}
							>
								<button
									type="button"
									className="flex gap-2 items-center w-full text-left"
									disabled={!fileUploadEnabled}
									onClick={() => {
										if (!fileUploadEnabled) return;
										if (!detectMobile()) {
											screenCaptureHandler();
										} else if (cameraInputRef.current) {
											cameraInputRef.current.click();
										}
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										className="w-5 h-5"
										aria-hidden="true"
									>
										<title>Capture image</title>
										<path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
										<path
											fillRule="evenodd"
											d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
											clipRule="evenodd"
										/>
									</svg>
									<div className="line-clamp-1">Capture</div>
								</button>
							</div>
						</Tooltip>

						<Tooltip content={fileUploadTooltip()} className="w-full">
							<div
								className={`flex gap-2 items-center px-3 py-2 text-sm font-medium rounded-xl ${!fileUploadEnabled ? 'opacity-50' : ''}`}
							>
								<button
									type="button"
									className="flex gap-2 items-center w-full text-left"
									disabled={!fileUploadEnabled}
									onClick={() => fileUploadEnabled && uploadFilesHandler()}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										className="w-5 h-5"
										aria-hidden="true"
									>
										<title>Upload files</title>
										<path
											fillRule="evenodd"
											d="M10.5 3.75a6 6 0 0 0-5.98 6.496A5.25 5.25 0 0 0 6.75 20.25H18a4.5 4.5 0 0 0 2.206-8.423 3.75 3.75 0 0 0-4.133-4.303A6.001 6.001 0 0 0 10.5 3.75Zm2.03 5.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72v4.94a.75.75 0 0 0 1.5 0v-4.94l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3-3Z"
											clipRule="evenodd"
										/>
									</svg>
									<div className="line-clamp-1">Upload Files</div>
								</button>
							</div>
						</Tooltip>

						{fileUploadEnabled && (
							<>
								<div className="px-3 py-2">
									<button
										type="button"
										className="flex gap-2 items-center text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
										onClick={() => uploadGoogleDriveHandler()}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 87.3 78"
											className="w-5 h-5"
											aria-hidden="true"
										>
											<path
												d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
												fill="#0066da"
											/>
											<path
												d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
												fill="#00ac47"
											/>
											<path
												d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
												fill="#ea4335"
											/>
											<path
												d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
												fill="#00832d"
											/>
											<path
												d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
												fill="#2684fc"
											/>
											<path
												d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
												fill="#ffba00"
											/>
										</svg>
										<div className="line-clamp-1">Google Drive</div>
									</button>
								</div>

								<div className="relative px-3 py-2">
									<button
										type="button"
										className="flex gap-2 items-center text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl px-2 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
										onClick={() => {
											/* OneDrive integration placeholder */
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 32 32"
											className="w-5 h-5"
											aria-hidden="true"
										>
											<defs>
												<linearGradient
													id="paint0_linear"
													x1="4.42591"
													y1="24.6668"
													x2="27.2309"
													y2="23.2764"
													gradientUnits="userSpaceOnUse"
												>
													<stop stopColor="#2086B8" />
													<stop offset="1" stopColor="#46D3F6" />
												</linearGradient>
												<linearGradient
													id="paint1_linear"
													x1="23.8302"
													y1="19.6668"
													x2="30.2108"
													y2="15.2082"
													gradientUnits="userSpaceOnUse"
												>
													<stop stopColor="#1694DB" />
													<stop offset="1" stopColor="#62C3FE" />
												</linearGradient>
												<linearGradient
													id="paint2_linear"
													x1="8.51037"
													y1="7.33333"
													x2="23.3335"
													y2="15.9348"
													gradientUnits="userSpaceOnUse"
												>
													<stop stopColor="#0D3D78" />
													<stop offset="1" stopColor="#063B83" />
												</linearGradient>
												<linearGradient
													id="paint3_linear"
													x1="-0.340429"
													y1="19.9998"
													x2="14.5634"
													y2="14.4649"
													gradientUnits="userSpaceOnUse"
												>
													<stop stopColor="#16589B" />
													<stop offset="1" stopColor="#1464B7" />
												</linearGradient>
											</defs>
											<path
												d="M7.83017 26.0001C5.37824 26.0001 3.18957 24.8966 1.75391 23.1691L18.0429 16.3335L30.7089 23.4647C29.5926 24.9211 27.9066 26.0001 26.0004 25.9915C23.1254 26.0001 12.0629 26.0001 7.83017 26.0001Z"
												fill="url(#paint0_linear)"
											/>
											<path
												d="M25.5785 13.3149L18.043 16.3334L30.709 23.4647C31.5199 22.4065 32.0004 21.0916 32.0004 19.6669C32.0004 16.1857 29.1321 13.3605 25.5833 13.3337C25.5817 13.3274 25.5801 13.3212 25.5785 13.3149Z"
												fill="url(#paint1_linear)"
											/>
											<path
												d="M7.06445 10.7028L18.0423 16.3333L25.5779 13.3148C24.5051 9.11261 20.6237 6 15.9997 6C12.4141 6 9.27508 7.87166 7.54586 10.6716C7.3841 10.6773 7.22358 10.6877 7.06445 10.7028Z"
												fill="url(#paint2_linear)"
											/>
											<path
												d="M1.7535 23.1687L18.0425 16.3331L7.06471 10.7026C3.09947 11.0792 0 14.3517 0 18.3331C0 20.1665 0.657197 21.8495 1.7535 23.1687Z"
												fill="url(#paint3_linear)"
											/>
										</svg>
										<div className="line-clamp-1">Microsoft OneDrive</div>
									</button>
									{/* Submenu would go here in a real implementation */}
								</div>
							</>
						)}
					</div>
				</div>
			</Dropdown>
		</>
	);
};

export default InputMenu;
