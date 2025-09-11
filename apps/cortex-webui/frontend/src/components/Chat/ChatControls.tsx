'use client';

import type React from 'react';
import { useState } from 'react';
import notificationStore from '../../utils/notification-store';
import ImportModal from './ImportModal';
import SettingsModal from './SettingsModal';
import ShareChatModal from './ShareChatModal';
import ShortcutsModal from './ShortcutsModal';
import TagChatModal from './TagChatModal';
import ToolServersModal from './ToolServersModal';

interface ChatControlsProps {
	chatId: string;
	chatTitle: string;
	onClearChat: () => void;
	onNewChat: () => void;
}

const ChatControls: React.FC<ChatControlsProps> = ({
	chatId,
	chatTitle,
	onClearChat,
	onNewChat,
}) => {
	const [isShareModalOpen, setIsShareModalOpen] = useState(false);
	const [isTagModalOpen, setIsTagModalOpen] = useState(false);
	const [isToolServersModalOpen, setIsToolServersModalOpen] = useState(false);
	const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
	const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [chatTags, setChatTags] = useState<any[]>([]);

	const handleImport = (data: any) => {
		// Handle imported data
		console.log('Imported data:', data);
		notificationStore.addNotification({
			type: 'success',
			message: 'Chat imported successfully',
		});
	};

	const handleTagsUpdate = (tags: any[]) => {
		setChatTags(tags);
		notificationStore.addNotification({
			type: 'success',
			message: 'Chat tags updated',
		});
	};

	const handleSaveSettings = (settings: any) => {
		// Save settings
		console.log('Saved settings:', settings);
		notificationStore.addNotification({
			type: 'success',
			message: 'Settings saved successfully',
		});
	};

	return (
		<>
			<div className="flex items-center space-x-2">
				<button
					onClick={onNewChat}
					className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
					aria-label="New chat"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<button
					onClick={() => setIsShareModalOpen(true)}
					className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
					aria-label="Share chat"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
					</svg>
				</button>

				<button
					onClick={() => setIsTagModalOpen(true)}
					className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
					aria-label="Tag chat"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<button
					onClick={onClearChat}
					className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
					aria-label="Clear chat"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<button
					onClick={() => setIsImportModalOpen(true)}
					className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
					aria-label="Import chat"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<button
					onClick={() => setIsToolServersModalOpen(true)}
					className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
					aria-label="Tool servers"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<button
					onClick={() => setIsSettingsModalOpen(true)}
					className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
					aria-label="Chat settings"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<button
					onClick={() => setIsShortcutsModalOpen(true)}
					className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
					aria-label="Keyboard shortcuts"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
							clipRule="evenodd"
						/>
					</svg>
				</button>
			</div>

			<ShareChatModal
				isOpen={isShareModalOpen}
				onClose={() => setIsShareModalOpen(false)}
				chatId={chatId}
				chatTitle={chatTitle}
			/>

			<TagChatModal
				isOpen={isTagModalOpen}
				onClose={() => setIsTagModalOpen(false)}
				chatId={chatId}
				chatTitle={chatTitle}
				initialTags={chatTags}
				onTagsUpdate={handleTagsUpdate}
			/>

			<ToolServersModal
				isOpen={isToolServersModalOpen}
				onClose={() => setIsToolServersModalOpen(false)}
				servers={[]}
				onSave={(servers) => console.log('Saved tool servers:', servers)}
			/>

			<SettingsModal
				isOpen={isSettingsModalOpen}
				onClose={() => setIsSettingsModalOpen(false)}
				onSave={handleSaveSettings}
				initialSettings={{}}
			/>

			<ShortcutsModal
				isOpen={isShortcutsModalOpen}
				onClose={() => setIsShortcutsModalOpen(false)}
			/>

			<ImportModal
				isOpen={isImportModalOpen}
				onClose={() => setIsImportModalOpen(false)}
				onImport={handleImport}
			/>
		</>
	);
};

export default ChatControls;
