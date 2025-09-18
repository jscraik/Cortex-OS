'use client';

import type React from 'react';
import Modal from '@/components/common/Modal';

interface Shortcut {
	key: string;
	description: string;
	category: string;
}

interface ShortcutsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
	const shortcuts: Shortcut[] = [
		// Chat shortcuts
		{ key: 'Enter', description: 'Send message', category: 'Chat' },
		{ key: 'Shift + Enter', description: 'Add new line', category: 'Chat' },
		{
			key: 'Ctrl + Enter',
			description: 'Add new line (alternative)',
			category: 'Chat',
		},
		{ key: 'Esc', description: 'Cancel editing', category: 'Chat' },
		{ key: '↑ / ↓', description: 'Navigate chat history', category: 'Chat' },

		// Navigation shortcuts
		{
			key: 'Ctrl + Shift + K',
			description: 'Focus search',
			category: 'Navigation',
		},
		{ key: 'Ctrl + N', description: 'New chat', category: 'Navigation' },
		{
			key: 'Ctrl + Shift + N',
			description: 'New folder',
			category: 'Navigation',
		},
		{ key: 'Ctrl + O', description: 'Open chat', category: 'Navigation' },
		{
			key: 'Ctrl + Shift + O',
			description: 'Open settings',
			category: 'Navigation',
		},

		// Editing shortcuts
		{ key: 'Ctrl + B', description: 'Bold text', category: 'Editing' },
		{ key: 'Ctrl + I', description: 'Italic text', category: 'Editing' },
		{ key: 'Ctrl + U', description: 'Underline text', category: 'Editing' },
		{ key: 'Ctrl + K', description: 'Insert link', category: 'Editing' },
		{
			key: 'Ctrl + Shift + K',
			description: 'Insert code',
			category: 'Editing',
		},

		// Application shortcuts
		{ key: 'Ctrl + ,', description: 'Open settings', category: 'Application' },
		{
			key: 'Ctrl + Shift + D',
			description: 'Toggle dark mode',
			category: 'Application',
		},
		{
			key: 'Ctrl + Shift + F',
			description: 'Toggle fullscreen',
			category: 'Application',
		},
		{
			key: 'Ctrl + Shift + H',
			description: 'Show shortcuts',
			category: 'Application',
		},
		{
			key: 'Ctrl + Shift + P',
			description: 'Open command palette',
			category: 'Application',
		},

		// Model shortcuts
		{ key: 'Ctrl + M', description: 'Switch model', category: 'Model' },
		{
			key: 'Ctrl + Shift + M',
			description: 'Open model selector',
			category: 'Model',
		},
	];

	const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="lg">
			<div className="p-6">
				<div className="space-y-6">
					<div>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Quick reference for keyboard shortcuts available in the application.
						</p>
					</div>

					<div className="space-y-8">
						{categories.map((category) => (
							<div key={category}>
								<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
									{category}
								</h3>
								<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
									<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
										<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
											{shortcuts
												.filter((s) => s.category === category)
												.map((shortcut, index) => (
													<tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750">
														<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
															{shortcut.description}
														</td>
														<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
															<kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
																{shortcut.key}
															</kbd>
														</td>
													</tr>
												))}
										</tbody>
									</table>
								</div>
							</div>
						))}
					</div>

					<div className="text-sm text-gray-500 dark:text-gray-400">
						<p>
							<span className="font-medium">Note:</span> On macOS, use{' '}
							<kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
								Cmd
							</kbd>{' '}
							instead of{' '}
							<kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
								Ctrl
							</kbd>
							.
						</p>
					</div>
				</div>
			</div>
		</Modal>
	);
};

export default ShortcutsModal;
