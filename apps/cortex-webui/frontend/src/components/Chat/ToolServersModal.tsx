'use client';

import type React from 'react';
import { useId, useState } from 'react';
import notificationStore from '../../utils/notification-store';
import Modal from '../common/Modal';

interface ToolServer {
	id: string;
	name: string;
	url: string;
	apiKey: string;
	enabled: boolean;
}

interface ToolServersModalProps {
	isOpen: boolean;
	onClose: () => void;
	servers: ToolServer[];
	onSave: (servers: ToolServer[]) => void;
}

const ToolServersModal: React.FC<ToolServersModalProps> = ({
	isOpen,
	onClose,
	servers,
	onSave,
}) => {
	const [toolServers, setToolServers] = useState<ToolServer[]>(servers);
	const [newServer, setNewServer] = useState({
		name: '',
		url: '',
		apiKey: '',
	});

	// Unique IDs for form controls
	const serverNameId = useId();
	const serverUrlId = useId();
	const apiKeyId = useId();

	const handleAddServer = () => {
		if (newServer.name && newServer.url) {
			const server: ToolServer = {
				id: Date.now().toString(),
				name: newServer.name,
				url: newServer.url,
				apiKey: newServer.apiKey,
				enabled: true,
			};

			setToolServers([...toolServers, server]);
			setNewServer({ name: '', url: '', apiKey: '' });
			notificationStore.addNotification({
				type: 'success',
				message: 'Tool server added successfully',
			});
		}
	};

	const handleRemoveServer = (id: string) => {
		setToolServers(toolServers.filter((server) => server.id !== id));
		notificationStore.addNotification({
			type: 'success',
			message: 'Tool server removed',
		});
	};

	const handleToggleServer = (id: string) => {
		setToolServers(
			toolServers.map((server) =>
				server.id === id ? { ...server, enabled: !server.enabled } : server,
			),
		);
	};

	const handleSave = () => {
		onSave(toolServers);
		onClose();
		notificationStore.addNotification({
			type: 'success',
			message: 'Tool servers saved successfully',
		});
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Tool Servers" size="lg">
			<div className="space-y-6">
				<div>
					<h3 className="text-lg font-medium text-gray-900 mb-4">
						Add New Tool Server
					</h3>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label
								htmlFor={serverNameId}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Server Name
							</label>
							<input
								id={serverNameId}
								type="text"
								value={newServer.name}
								onChange={(e) =>
									setNewServer({ ...newServer, name: e.target.value })
								}
								placeholder="e.g., Code Interpreter"
								className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label
								htmlFor={serverUrlId}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Server URL
							</label>
							<input
								id={serverUrlId}
								type="url"
								value={newServer.url}
								onChange={(e) =>
									setNewServer({ ...newServer, url: e.target.value })
								}
								placeholder="https://api.example.com"
								className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div className="sm:col-span-2">
							<label
								htmlFor={apiKeyId}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								API Key (Optional)
							</label>
							<input
								id={apiKeyId}
								type="password"
								value={newServer.apiKey}
								onChange={(e) =>
									setNewServer({ ...newServer, apiKey: e.target.value })
								}
								placeholder="Enter API key if required"
								className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
					</div>
					<div className="mt-4">
						<button
							type="button"
							onClick={handleAddServer}
							className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						>
							Add Server
						</button>
					</div>
				</div>

				<div>
					<h3 className="text-lg font-medium text-gray-900 mb-4">
						Configured Tool Servers
					</h3>
					{toolServers.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-12 w-12 mx-auto text-gray-300"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
								focusable="false"
							>
								<title>No tool servers icon</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
								/>
							</svg>
							<p className="mt-2">No tool servers configured</p>
							<p className="text-sm">Add a server above to get started</p>
						</div>
					) : (
						<div className="space-y-3">
							{toolServers.map((server) => (
								<div
									key={server.id}
									className="flex items-center justify-between p-4 border rounded-lg"
								>
									<div className="flex items-center">
										<div className="flex items-center h-5">
											<input
												type="checkbox"
												checked={server.enabled}
												onChange={() => handleToggleServer(server.id)}
												className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
											/>
										</div>
										<div className="ml-4">
											<div className="text-sm font-medium text-gray-900">
												{server.name}
											</div>
											<div className="text-sm text-gray-500">{server.url}</div>
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleRemoveServer(server.id)}
										className="text-red-600 hover:text-red-900"
										aria-label={`Remove ${server.name}`}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-5 w-5"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<title>Delete tool server</title>
											<path
												fillRule="evenodd"
												d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
												clipRule="evenodd"
											/>
										</svg>
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="flex justify-end space-x-3">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSave}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Save Changes
					</button>
				</div>
			</div>
		</Modal>
	);
};

export default ToolServersModal;
