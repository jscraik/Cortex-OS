'use client';

import type React from 'react';
import { useId, useState } from 'react';
import Modal from '@/components/common/Modal';

type PermissionKey = 'allowEdit' | 'allowCopy' | 'allowDownload' | 'requireLogin';
interface ShareSettings {
	allowEdit: boolean;
	allowCopy: boolean;
	allowDownload: boolean;
	requireLogin: boolean;
	expiration: string;
}

interface PermissionsSectionProps {
	shareSettings: ShareSettings;
	setShareSettings: React.Dispatch<React.SetStateAction<ShareSettings>>;
	expirationSelectId: string;
}

const PermissionsSection: React.FC<PermissionsSectionProps> = ({
	shareSettings,
	setShareSettings,
	expirationSelectId,
}) => {
	const permissionOptions: {
		key: PermissionKey;
		label: string;
		desc: string;
	}[] = [
		{
			key: 'allowEdit',
			label: 'Allow Editing',
			desc: 'Allow others to edit this chat',
		},
		{
			key: 'allowCopy',
			label: 'Allow Copying',
			desc: 'Allow others to copy content',
		},
		{
			key: 'allowDownload',
			label: 'Allow Download',
			desc: 'Allow others to download the chat',
		},
		{
			key: 'requireLogin',
			label: 'Require Login',
			desc: 'Users must log in to view',
		},
	];
	return (
		<div className="space-y-6">
			<div>
				<h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Permissions</h4>
				<div className="space-y-3">
					{permissionOptions.map(({ key, label, desc }) => (
						<div className="flex items-center justify-between" key={key}>
							<div>
								<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
									{label}
								</span>
								<p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
							</div>
							<button
								type="button"
								onClick={() =>
									setShareSettings({
										...shareSettings,
										[key]: !shareSettings[key],
									})
								}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${shareSettings[key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shareSettings[key] ? 'translate-x-6' : 'translate-x-1'}`}
								/>
							</button>
						</div>
					))}
				</div>
			</div>
			<div>
				<label
					htmlFor={expirationSelectId}
					className="block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Link Expiration
				</label>
				<select
					id={expirationSelectId}
					value={shareSettings.expiration}
					onChange={(e) => setShareSettings({ ...shareSettings, expiration: e.target.value })}
					className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
				>
					<option value="never">Never</option>
					<option value="1h">1 Hour</option>
					<option value="1d">1 Day</option>
					<option value="7d">7 Days</option>
					<option value="30d">30 Days</option>
				</select>
			</div>
		</div>
	);
};

interface ShareChatModalProps {
	isOpen: boolean;
	onClose: () => void;
	chatId: string;
	chatTitle: string;
}

const ShareChatModal: React.FC<ShareChatModalProps> = ({
	isOpen,
	onClose,
	// ...existing code...
	chatTitle,
}) => {
	const shareLinkInputId = useId();
	const expirationSelectId = useId();
	const [shareLink, setShareLink] = useState('');
	const [isCopied, setIsCopied] = useState(false);
	const [shareSettings, setShareSettings] = useState<ShareSettings>({
		allowEdit: false,
		allowCopy: true,
		allowDownload: true,
		requireLogin: false,
		expiration: 'never',
	});

	const copyToClipboard = async () => {
		if (!shareLink) return;

		try {
			await navigator.clipboard.writeText(shareLink);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);

			if (typeof window !== 'undefined' && window.addNotification) {
				window.addNotification('success', 'Link copied to clipboard!');
			}
		} catch (err) {
			if (typeof window !== 'undefined' && window.addNotification) {
				window.addNotification('error', 'Failed to copy link');
			}
			// Optionally log the error for debugging

			console.error('Failed to copy link:', err);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Share Chat">
			<div className="p-6">
				<div className="space-y-6">
					<div>
						<h3 className="text-lg font-medium text-gray-900 dark:text-white">
							Share "{chatTitle}"
						</h3>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Share this chat with others by sending them the link below.
						</p>
					</div>

					{shareLink ? (
						<div className="space-y-4">
							<div>
								<label
									htmlFor={shareLinkInputId}
									className="block text-sm font-medium text-gray-700 dark:text-gray-300"
								>
									Share Link
								</label>
								<div className="mt-1 flex rounded-md shadow-sm">
									<input
										type="text"
										id={shareLinkInputId}
										value={shareLink}
										readOnly
										className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									/>
									<button
										type="button"
										onClick={copyToClipboard}
										className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
									>
										{isCopied ? 'Copied!' : 'Copy'}
									</button>
								</div>
							</div>

							<div className="flex space-x-3">
								<button
									type="button"
									onClick={() => {
										navigator
											.share?.({
												title: `Shared Chat: ${chatTitle}`,
												url: shareLink,
											})
											.catch(() => {
												// Fallback if Web Share API is not supported
												copyToClipboard();
											});
									}}
									className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="-ml-1 mr-2 h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<title>Share icon</title>
										<path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
									</svg>
									Share
								</button>

								<button
									type="button"
									onClick={() => {
										setShareLink('');
									}}
									className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
								>
									Regenerate
								</button>
							</div>
						</div>
					) : (
						<PermissionsSection
							shareSettings={shareSettings}
							setShareSettings={setShareSettings}
							expirationSelectId={expirationSelectId}
						/>
					)}
				</div>
			</div>
		</Modal>
	);
};

export default ShareChatModal;
