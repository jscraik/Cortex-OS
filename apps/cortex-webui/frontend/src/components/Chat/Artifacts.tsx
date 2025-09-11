'use client';

import type React from 'react';
import { useState } from 'react';
import Collapsible from '../common/Collapsible';

interface Artifact {
	id: string;
	name: string;
	type: string;
	content: string;
	timestamp: Date;
}

interface ArtifactsProps {
	artifacts: Artifact[];
	onArtifactSelect?: (artifact: Artifact) => void;
}

const Artifacts: React.FC<ArtifactsProps> = ({
	artifacts,
	onArtifactSelect,
}) => {
	const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(
		null,
	);

	if (artifacts.length === 0) return null;

	const getTypeIcon = (type: string) => {
		switch (type) {
			case 'code':
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 text-blue-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
						/>
					</svg>
				);
			case 'document':
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 text-green-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				);
			case 'image':
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 text-purple-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
				);
			default:
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4 text-gray-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
						/>
					</svg>
				);
		}
	};

	return (
		<div className="artifacts">
			<Collapsible
				title={`Artifacts (${artifacts.length})`}
				defaultOpen={false}
			>
				<div className="space-y-2">
					{artifacts.map((artifact) => (
						<div
							key={artifact.id}
							className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer"
							onClick={() => {
								setSelectedArtifact(artifact);
								if (onArtifactSelect) {
									onArtifactSelect(artifact);
								}
							}}
						>
							<div className="flex-shrink-0">{getTypeIcon(artifact.type)}</div>
							<div className="ml-3 flex-1 min-w-0">
								<p className="text-sm font-medium text-gray-900 truncate">
									{artifact.name}
								</p>
								<p className="text-xs text-gray-500">
									{artifact.timestamp.toLocaleDateString()}
								</p>
							</div>
						</div>
					))}
				</div>
			</Collapsible>
		</div>
	);
};

export default Artifacts;
