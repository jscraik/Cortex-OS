'use client';

import type React from 'react';
import { useId, useState } from 'react';
import ThemeSwitcher from './ThemeSwitcher';

interface SettingsPageProps {
	theme: 'light' | 'dark';
	onThemeChange: (theme: 'light' | 'dark') => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
	theme,
	onThemeChange,
}) => {
	const [apiKey, setApiKey] = useState('');
	const [model, setModel] = useState('gpt-4');
	const modelId = useId();
	const apiKeyId = useId();
	const statusId = useId();
	const [status, setStatus] = useState<string | null>(null);

	const handleSave = () => {
		try {
			if (typeof window !== 'undefined') {
				localStorage.setItem('settings:apiKey', apiKey);
				localStorage.setItem('settings:model', model);
			}
			setStatus('Settings saved');
			setTimeout(() => setStatus(null), 2500);
		} catch (e) {
			console.error('Failed to save settings', e);
			setStatus('Failed to save');
		}
	};

	const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
		e.preventDefault();
		handleSave();
	};

	return (
		<div className="max-w-2xl mx-auto p-6">
			<h1 className="text-2xl font-bold mb-6">Settings</h1>

			<form
				onSubmit={handleSubmit}
				className="space-y-6"
				aria-describedby={status ? statusId : undefined}
			>
				<div className="border-b pb-6">
					<h2 className="text-lg font-medium mb-4">Appearance</h2>
					<ThemeSwitcher theme={theme} onThemeChange={onThemeChange} />
				</div>

				<div className="border-b pb-6">
					<h2 className="text-lg font-medium mb-4">Model Settings</h2>
					<div className="space-y-4">
						<div>
							<label
								htmlFor={modelId}
								className="block text-sm font-medium text-gray-700"
							>
								Default Model
							</label>
							<select
								id={modelId}
								value={model}
								onChange={(e) => setModel(e.target.value)}
								className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
							>
								<option value="gpt-4">GPT-4</option>
								<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
								<option value="claude-2">Claude 2</option>
								<option value="llama-2">Llama 2</option>
							</select>
						</div>
					</div>
				</div>

				<div className="border-b pb-6">
					<h2 className="text-lg font-medium mb-4">API Configuration</h2>
					<div className="space-y-4">
						<div>
							<label
								htmlFor={apiKeyId}
								className="block text-sm font-medium text-gray-700"
							>
								API Key
							</label>
							<input
								id={apiKeyId}
								type="password"
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
								className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
								placeholder="Enter your API key"
							/>
							<p className="mt-1 text-sm text-gray-500">
								Your API key is stored locally and never sent to any server
								except the AI provider.
							</p>
						</div>
					</div>
				</div>

				<div className="flex justify-end">
					<button
						type="submit"
						className="bg-blue-500 text-white rounded px-4 py-2"
					>
						Save Settings
					</button>
				</div>

				{status && (
					<output
						id={statusId}
						className="text-sm text-gray-600"
						aria-live="polite"
					>
						{status}
					</output>
				)}
			</form>
		</div>
	);
};

export default SettingsPage;
