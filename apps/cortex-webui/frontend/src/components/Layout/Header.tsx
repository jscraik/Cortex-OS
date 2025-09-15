
interface HeaderProps {
	title: string;
	onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onToggleSidebar }) => {
	return (
		<header className="bg-white border-b p-4 flex items-center justify-between">
			<div className="flex items-center">
				{onToggleSidebar && (
					<button
						onClick={onToggleSidebar}
						className="mr-4 p-2 rounded-md hover:bg-gray-100"
						aria-label="Toggle sidebar"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
								clipRule="evenodd"
							import React from 'react';
							/>
						</svg>
								readonly title: string;
								readonly onToggleSidebar?: () => void;
				<h1 className="text-xl font-semibold">{title}</h1>
			</div>
			<div className="flex items-center space-x-4">
				<button className="p-2 rounded-full hover:bg-gray-100">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
					</svg>
				</button>
				<div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
					U
				</div>
			</div>
		</header>
	);
};

export default Header;
