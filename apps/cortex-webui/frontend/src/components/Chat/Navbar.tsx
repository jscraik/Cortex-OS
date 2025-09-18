import { useState } from 'react';
import ChatControls from './ChatControls';

interface NavbarProps {
	chatId: string;
	chatTitle: string;
	onClearChat: () => void;
	onNewChat: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ chatId, chatTitle, onClearChat, onNewChat }) => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<div className="navbar p-4 border-b flex justify-between items-center">
			<div className="flex items-center">
				<a href="/mvp/chat" className="text-xl font-bold text-blue-600">
					brAInwav
				</a>
				<span className="mx-2 text-gray-300">/</span>
				<h1 className="text-lg font-medium text-gray-900 truncate max-w-xs">
					{chatTitle || 'New Chat'}
				</h1>
			</div>

			<div className="flex items-center space-x-2">
				<ChatControls
					chatId={chatId}
					chatTitle={chatTitle}
					onClearChat={onClearChat}
					onNewChat={onNewChat}
				/>

				<div className="relative">
					<button
						onClick={() => setIsMenuOpen(!isMenuOpen)}
						className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
						aria-label="User menu"
						aria-haspopup="menu"
						aria-expanded={isMenuOpen}
						type="button"
					>
						<span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.036-.687-.101-1.016A5 5 0 0010 11z"
									clipRule="evenodd"
								/>
							</svg>
						</span>
					</button>

					{isMenuOpen && (
						<div
							className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
							role="menu"
							aria-label="User menu"
						>
							<a
								href="/settings"
								className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
								role="menuitem"
							>
								Settings
							</a>
							<a
								href="/profile"
								className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
								role="menuitem"
							>
								Profile
							</a>
							<a
								href="/logout"
								className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
								role="menuitem"
							>
								Sign out
							</a>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Navbar;
