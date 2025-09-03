import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Conversation } from '../../types';
import SearchModal from './SearchModal';

interface SidebarProps {
	conversations?: Conversation[];
	activeConversationId?: string | null;
	onSelectConversation?: (id: string) => void;
	onCreateConversation?: () => void;
	onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
	conversations = [],
	activeConversationId = null,
	onSelectConversation,
	onCreateConversation,
	onLogout,
}) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [isSearchOpen, setIsSearchOpen] = useState(false);

	const navItems = [
		{ name: 'Chat', href: '/mvp/chat' },
		{ name: 'Map', href: '/mvp/map' },
		{ name: 'Approvals', href: '/approvals' },
		{ name: 'Crawl', href: '/crawl' },
		{ name: 'Puck', href: '/puck' },
	];

	const handleSelectConversation = (id: string) => {
		if (onSelectConversation) {
			onSelectConversation(id);
		}
		navigate(`/chat/${id}`);
	};

	const handleCreateConversation = () => {
		if (onCreateConversation) {
			onCreateConversation();
		}
	};

	return (
		<>
			<div className="w-64 bg-white border-r flex flex-col">
				<div className="p-4 border-b">
					<h1 className="text-xl font-bold text-blue-600">brAInwav</h1>
					<p className="text-xs text-gray-500">Cortex WebUI</p>
				</div>

				<div className="p-2">
					<button
						onClick={() => setIsSearchOpen(true)}
						className="w-full flex items-center p-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100"
						type="button"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 text-gray-400"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-label="Search"
						>
							<title>Search</title>
							<path
								fillRule="evenodd"
								d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
								clipRule="evenodd"
							/>
						</svg>
						<span className="ml-3">Search...</span>
						<span className="ml-auto text-xs text-gray-400">⌘K</span>
					</button>
				</div>

				{/* Conversations Section */}
				{conversations && conversations.length > 0 && (
					<div className="px-2 py-2 border-b">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
								Conversations
							</h3>
							<button
								onClick={handleCreateConversation}
								className="text-blue-600 hover:text-blue-800 text-sm"
								type="button"
							>
								+
							</button>
						</div>
						<div className="space-y-1 max-h-40 overflow-y-auto">
							{conversations.map((conversation) => (
								<button
									key={conversation.id}
									onClick={() => handleSelectConversation(conversation.id)}
									className={`w-full text-left p-2 text-sm rounded-lg ${
										conversation.id === activeConversationId
											? 'bg-blue-100 text-blue-800'
											: 'text-gray-700 hover:bg-gray-100'
									}`}
									type="button"
								>
									<div className="font-medium truncate">
										{conversation.title || 'Untitled'}
									</div>
									<div className="text-xs text-gray-500">
										{new Date(conversation.updatedAt).toLocaleDateString()}
									</div>
								</button>
							))}
						</div>
					</div>
				)}

				<nav className="flex-1 px-2 py-4">
					<ul className="space-y-1">
						{navItems.map((item) => (
							<li key={item.name}>
								<button
									onClick={() => navigate(item.href)}
									className={`w-full text-left flex items-center p-2 text-sm rounded-lg ${
										location.pathname === item.href
											? 'bg-blue-100 text-blue-800'
											: 'text-gray-700 hover:bg-gray-100'
									}`}
									type="button"
								>
									<span className="ml-3">{item.name}</span>
								</button>
							</li>
						))}
					</ul>
				</nav>

				<div className="p-4 border-t">
					<div className="flex items-center justify-between">
						<div className="flex items-center">
							<div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
								U
							</div>
							<div className="ml-3">
								<p className="text-sm font-medium">User</p>
								<p className="text-xs text-gray-500">user@example.com</p>
							</div>
						</div>
						{onLogout && (
							<button
								onClick={onLogout}
								className="text-gray-500 hover:text-gray-700 text-sm"
								type="button"
							>
								Logout
							</button>
						)}
					</div>
				</div>
			</div>

			<SearchModal
				isOpen={isSearchOpen}
				onClose={() => setIsSearchOpen(false)}
			/>
		</>
	);
};

export default Sidebar;
