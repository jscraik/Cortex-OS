'use client';

import type React from 'react';
import { useState } from 'react';

interface Tool {
	id: string;
	name: string;
	description: string;
	icon: string;
	enabled: boolean;
}

interface ToolIntegrationProps {
	tools: Tool[];
	onToolToggle: (toolId: string, enabled: boolean) => void;
}

const ToolIntegration: React.FC<ToolIntegrationProps> = ({ tools, onToolToggle }) => {
	const [expanded, setExpanded] = useState(false);

	const toggleTool = (toolId: string, enabled: boolean) => {
		onToolToggle(toolId, enabled);
	};

	return (
		<div className="border rounded-lg p-4 mb-4">
			<div
				className="flex justify-between items-center cursor-pointer"
				onClick={() => setExpanded(!expanded)}
			>
				<h3 className="text-lg font-semibold">Tool Integrations</h3>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className={`h-5 w-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fillRule="evenodd"
						d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
						clipRule="evenodd"
					/>
				</svg>
			</div>

			{expanded && (
				<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
					{tools.map((tool) => (
						<div key={tool.id} className="border rounded-lg p-3 flex items-start">
							<div className="flex-shrink-0 mr-3">
								<div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
							</div>
							<div className="flex-1">
								<div className="flex justify-between">
									<h4 className="font-medium">{tool.name}</h4>
									<label className="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={tool.enabled}
											onChange={(e) => toggleTool(tool.id, e.target.checked)}
											className="sr-only peer"
										/>
										<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
									</label>
								</div>
								<p className="text-sm text-gray-600 mt-1">{tool.description}</p>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default ToolIntegration;
