'use client';

import { useEffect, useId, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

// Type for the connections settings object
export interface ConnectionsSettingsShape {
	openaiApiKey: string;
	anthropicApiKey: string;
	googleApiKey: string;
	mistralApiKey: string;
	groqApiKey: string;
	openRouterApiKey: string;
	customOpenaiEndpoint: string;
	customOpenaiApiKey: string;
}

const ConnectionsSettings: React.FC<{
	saveSettings: (settings: { connections: ConnectionsSettingsShape }) => void;
}> = ({ saveSettings }) => {
	const settings = useSettingsStore();
	const [loaded, setLoaded] = useState(false);

	// Connections settings state
	const [openaiApiKey, setOpenaiApiKey] = useState('');
	const [anthropicApiKey, setAnthropicApiKey] = useState('');
	const [googleApiKey, setGoogleApiKey] = useState('');
	const [mistralApiKey, setMistralApiKey] = useState('');
	const [groqApiKey, setGroqApiKey] = useState('');
	const [openRouterApiKey, setOpenRouterApiKey] = useState('');
	const [customOpenaiEndpoint, setCustomOpenaiEndpoint] = useState('');
	const [customOpenaiApiKey, setCustomOpenaiApiKey] = useState('');

	// useId for unique id prefixes
	const idPrefix = useId();

	// Generate unique ids for each input
	const openaiApiKeyId = `${idPrefix}-openai-api-key`;
	const anthropicApiKeyId = `${idPrefix}-anthropic-api-key`;
	const googleApiKeyId = `${idPrefix}-google-api-key`;
	const mistralApiKeyId = `${idPrefix}-mistral-api-key`;
	const groqApiKeyId = `${idPrefix}-groq-api-key`;
	const openRouterApiKeyId = `${idPrefix}-openrouter-api-key`;
	const customOpenaiEndpointId = `${idPrefix}-custom-openai-endpoint`;
	const customOpenaiApiKeyId = `${idPrefix}-custom-openai-api-key`;
	const rootDivId = `${idPrefix}-tab-connections`;

	useEffect(() => {
		if (settings) {
			setOpenaiApiKey(settings?.connections?.openaiApiKey ?? '');
			setAnthropicApiKey(settings?.connections?.anthropicApiKey ?? '');
			setGoogleApiKey(settings?.connections?.googleApiKey ?? '');
			setMistralApiKey(settings?.connections?.mistralApiKey ?? '');
			setGroqApiKey(settings?.connections?.groqApiKey ?? '');
			setOpenRouterApiKey(settings?.connections?.openRouterApiKey ?? '');
			setCustomOpenaiEndpoint(settings?.connections?.customOpenaiEndpoint ?? '');
			setCustomOpenaiApiKey(settings?.connections?.customOpenaiApiKey ?? '');
			setLoaded(true);
		}
	}, [settings]);

	const handleSubmit = () => {
		saveSettings({
			connections: {
				openaiApiKey,
				anthropicApiKey,
				googleApiKey,
				mistralApiKey,
				groqApiKey,
				openRouterApiKey,
				customOpenaiEndpoint,
				customOpenaiApiKey,
			},
		});
	};

	const handleTestConnection = (service: string) => {
		// In a real implementation, this would test the connection to the service
		alert(`Testing connection to ${service}...`);
	};

	if (!loaded) {
		return <div>Loading...</div>;
	}

	return (
		<div id={rootDivId} className="flex flex-col h-full justify-between text-sm">
			<div className="overflow-y-scroll max-h-[28rem] lg:max-h-full space-y-6">
				<div>
					<div className="text-base font-medium mb-3">API Keys</div>
					<div className="text-xs text-gray-500 mb-4">
						Add your API keys to connect to different AI services. Your keys are stored locally and
						never sent to any server.
					</div>

					<div className="space-y-4">
						<div>
							<label htmlFor={openaiApiKeyId} className="block text-sm font-medium mb-1">
								OpenAI API Key
							</label>
							<div className="flex space-x-2">
								<input
									id={openaiApiKeyId}
									type="password"
									value={openaiApiKey}
									onChange={(e) => setOpenaiApiKey(e.target.value)}
									placeholder="sk-..."
									className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
								/>
								<button
									type="button"
									onClick={() => handleTestConnection('OpenAI')}
									className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
								>
									Test
								</button>
							</div>
						</div>

						<div>
							<label htmlFor={anthropicApiKeyId} className="block text-sm font-medium mb-1">
								Anthropic API Key
							</label>
							<div className="flex space-x-2">
								<input
									id={anthropicApiKeyId}
									type="password"
									value={anthropicApiKey}
									onChange={(e) => setAnthropicApiKey(e.target.value)}
									placeholder="sk-ant-..."
									className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
								/>
								<button
									type="button"
									onClick={() => handleTestConnection('Anthropic')}
									className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
								>
									Test
								</button>
							</div>
						</div>

						<div>
							<label htmlFor={googleApiKeyId} className="block text-sm font-medium mb-1">
								Google API Key
							</label>
							<div className="flex space-x-2">
								<input
									id={googleApiKeyId}
									type="password"
									value={googleApiKey}
									onChange={(e) => setGoogleApiKey(e.target.value)}
									placeholder="AIza..."
									className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
								/>
								<button
									type="button"
									onClick={() => handleTestConnection('Google')}
									className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
								>
									Test
								</button>
							</div>
						</div>

						<div>
							<label htmlFor={mistralApiKeyId} className="block text-sm font-medium mb-1">
								Mistral API Key
							</label>
							<div className="flex space-x-2">
								<input
									id={mistralApiKeyId}
									type="password"
									value={mistralApiKey}
									onChange={(e) => setMistralApiKey(e.target.value)}
									placeholder="..."
									className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
								/>
								<button
									type="button"
									onClick={() => handleTestConnection('Mistral')}
									className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
								>
									Test
								</button>
							</div>
						</div>

						<div>
							<label htmlFor={groqApiKeyId} className="block text-sm font-medium mb-1">
								Groq API Key
							</label>
							<div className="flex space-x-2">
								<input
									id={groqApiKeyId}
									type="password"
									value={groqApiKey}
									onChange={(e) => setGroqApiKey(e.target.value)}
									placeholder="gsk_..."
									className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
								/>
								<button
									type="button"
									onClick={() => handleTestConnection('Groq')}
									className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
								>
									Test
								</button>
							</div>
						</div>

						<div>
							<label htmlFor={openRouterApiKeyId} className="block text-sm font-medium mb-1">
								OpenRouter API Key
							</label>
							<div className="flex space-x-2">
								<input
									id={openRouterApiKeyId}
									type="password"
									value={openRouterApiKey}
									onChange={(e) => setOpenRouterApiKey(e.target.value)}
									placeholder="sk-or-..."
									className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
								/>
								<button
									type="button"
									onClick={() => handleTestConnection('OpenRouter')}
									className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
								>
									Test
								</button>
							</div>
						</div>
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-3">Custom Endpoints</div>

					<div className="space-y-4">
						<div>
							<label htmlFor={customOpenaiEndpointId} className="block text-sm font-medium mb-1">
								Custom OpenAI Endpoint
							</label>
							<input
								id={customOpenaiEndpointId}
								type="url"
								value={customOpenaiEndpoint}
								onChange={(e) => setCustomOpenaiEndpoint(e.target.value)}
								placeholder="https://api.openai.com/v1"
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							/>
						</div>

						<div>
							<label htmlFor={customOpenaiApiKeyId} className="block text-sm font-medium mb-1">
								Custom OpenAI API Key
							</label>
							<input
								id={customOpenaiApiKeyId}
								type="password"
								value={customOpenaiApiKey}
								onChange={(e) => setCustomOpenaiApiKey(e.target.value)}
								placeholder="API Key"
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							/>
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

export default ConnectionsSettings;
