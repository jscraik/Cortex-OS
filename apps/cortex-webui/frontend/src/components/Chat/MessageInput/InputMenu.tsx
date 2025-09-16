'use client';

import { useState } from 'react';
import Spinner from '../../common/Spinner';
import Switch from '../../common/Switch';
import Tooltip from '../../common/Tooltip';

interface Tool {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
}

const demoTools: Record<string, Tool> = {
	camera: {
		id: 'camera',
		name: 'Camera',
		description: 'Take a photo',
		enabled: false,
	},
	upload: {
		id: 'upload',
		name: 'Upload',
		description: 'Upload files',
		enabled: false,
	},
	drive: {
		id: 'drive',
		name: 'Google Drive',
		description: 'Upload from Google Drive',
		enabled: false,
	},
	onedrive: {
		id: 'onedrive',
		name: 'OneDrive',
		description: 'Upload from OneDrive',
		enabled: false,
	},
};

const InputMenu: React.FC = () => {
	const [tools, setTools] = useState<Record<string, Tool>>(demoTools);
	const [showAllTools, setShowAllTools] = useState(false);

	const toggleTool = (toolId: string, checked?: boolean) => {
		setTools((prev) => ({
			...prev,
			[toolId]: {
				...prev[toolId],
				enabled: checked ?? !prev[toolId].enabled,
			},
		}));
	};

	return (
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
			{tools && Object.keys(tools).length > 0 ? (
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
												onChange={(checked: boolean) =>
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
							aria-label={showAllTools ? 'Show fewer tools' : 'Show all tools'}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={2.5}
								stroke="currentColor"
								className={`size-3 transition-transform duration-200 ${showAllTools ? 'rotate-180' : ''} text-gray-300 dark:text-gray-600`}
								aria-hidden="true"
							>
								<title>Toggle tool list length</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="m19.5 8.25-7.5 7.5-7.5-7.5"
								/>
							</svg>
						</button>
					)}
					<hr className="border-black/5 dark:border-white/5 my-1" />
				</>
			) : (
				<div className="py-4">
					<Spinner />
				</div>
			)}
		</div>
	);
};

export default InputMenu;
