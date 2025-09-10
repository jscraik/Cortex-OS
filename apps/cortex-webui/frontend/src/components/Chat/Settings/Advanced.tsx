'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

interface AdvancedSettingsProps {
	saveSettings: (settings: any) => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
	saveSettings,
}) => {
	const settings = useSettingsStore();
	const [loaded, setLoaded] = useState(false);

	// Advanced settings state
	const [enableCommunitySharing, setEnableCommunitySharing] = useState(false);
	const [hideSuggestedPrompts, setHideSuggestedPrompts] = useState(false);
	const [playgroundEnabled, setPlaygroundEnabled] = useState(false);
	const [archiveChats, setArchiveChats] = useState(false);
	const [featureFlags, setFeatureFlags] = useState({
		audio: false,
		webSearch: false,
		images: false,
		codeExecution: false,
	});

	useEffect(() => {
		if (settings) {
			setEnableCommunitySharing(settings?.enableCommunitySharing ?? false);
			setHideSuggestedPrompts(settings?.hideSuggestedPrompts ?? false);
			setPlaygroundEnabled(settings?.playgroundEnabled ?? false);
			setArchiveChats(settings?.archiveChats ?? false);
			setFeatureFlags({
				audio: settings?.featureFlags?.audio ?? false,
				webSearch: settings?.featureFlags?.webSearch ?? false,
				images: settings?.featureFlags?.images ?? false,
				codeExecution: settings?.featureFlags?.codeExecution ?? false,
			});
			setLoaded(true);
		}
	}, [settings]);

	const handleSubmit = () => {
		saveSettings({
			enableCommunitySharing,
			hideSuggestedPrompts,
			playgroundEnabled,
			archiveChats,
			featureFlags,
		});
	};

	if (!loaded) {
		return <div>Loading...</div>;
	}

	return (
		<div
			id="tab-advanced"
			className="flex flex-col h-full justify-between text-sm"
		>
			<div className="overflow-y-scroll max-h-[28rem] lg:max-h-full space-y-4">
				<div>
					<div className="text-base font-medium mb-2">Community Sharing</div>
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium">Enable Community Sharing</div>
							<div className="text-xs text-gray-500 mt-0.5">
								Allow sharing of your prompts and templates with the community
							</div>
						</div>
						<button
							type="button"
							onClick={() => setEnableCommunitySharing(!enableCommunitySharing)}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
								enableCommunitySharing
									? 'bg-blue-600'
									: 'bg-gray-300 dark:bg-gray-600'
							}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
									enableCommunitySharing ? 'translate-x-6' : 'translate-x-1'
								}`}
							/>
						</button>
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-2">Interface</div>
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium">Hide Suggested Prompts</div>
							<div className="text-xs text-gray-500 mt-0.5">
								Hide suggested prompts in the chat input
							</div>
						</div>
						<button
							type="button"
							onClick={() => setHideSuggestedPrompts(!hideSuggestedPrompts)}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
								hideSuggestedPrompts
									? 'bg-blue-600'
									: 'bg-gray-300 dark:bg-gray-600'
							}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
									hideSuggestedPrompts ? 'translate-x-6' : 'translate-x-1'
								}`}
							/>
						</button>
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-2">Playground</div>
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium">Enable Playground</div>
							<div className="text-xs text-gray-500 mt-0.5">
								Enable the playground for testing models and prompts
							</div>
						</div>
						<button
							type="button"
							onClick={() => setPlaygroundEnabled(!playgroundEnabled)}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
								playgroundEnabled
									? 'bg-blue-600'
									: 'bg-gray-300 dark:bg-gray-600'
							}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
									playgroundEnabled ? 'translate-x-6' : 'translate-x-1'
								}`}
							/>
						</button>
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-2">Chats</div>
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium">Archive Chats</div>
							<div className="text-xs text-gray-500 mt-0.5">
								Automatically archive old chats to save space
							</div>
						</div>
						<button
							type="button"
							onClick={() => setArchiveChats(!archiveChats)}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
								archiveChats ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
							}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
									archiveChats ? 'translate-x-6' : 'translate-x-1'
								}`}
							/>
						</button>
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-2">Feature Flags</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Audio</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable audio features like voice input and output
								</div>
							</div>
							<button
								type="button"
								onClick={() =>
									setFeatureFlags({
										...featureFlags,
										audio: !featureFlags.audio,
									})
								}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									featureFlags.audio
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										featureFlags.audio ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Web Search</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable web search capabilities in chats
								</div>
							</div>
							<button
								type="button"
								onClick={() =>
									setFeatureFlags({
										...featureFlags,
										webSearch: !featureFlags.webSearch,
									})
								}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									featureFlags.webSearch
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										featureFlags.webSearch ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Images</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable image processing and generation features
								</div>
							</div>
							<button
								type="button"
								onClick={() =>
									setFeatureFlags({
										...featureFlags,
										images: !featureFlags.images,
									})
								}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									featureFlags.images
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										featureFlags.images ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Code Execution</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable code execution in chats
								</div>
							</div>
							<button
								type="button"
								onClick={() =>
									setFeatureFlags({
										...featureFlags,
										codeExecution: !featureFlags.codeExecution,
									})
								}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									featureFlags.codeExecution
										? 'bg-blue-600'
										: 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										featureFlags.codeExecution
											? 'translate-x-6'
											: 'translate-x-1'
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

export default AdvancedSettings;
