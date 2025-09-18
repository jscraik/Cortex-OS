import type React from 'react';

interface ThemeSwitcherProps {
	theme: 'light' | 'dark';
	onThemeChange: (theme: 'light' | 'dark') => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, onThemeChange }) => {
	return (
		<div className="flex items-center justify-between">
			<span className="text-sm font-medium text-gray-700">Dark Mode</span>
			<button
				onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
				className={`relative inline-flex h-6 w-11 items-center rounded-full ${
					theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'
				}`}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
						theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
					}`}
				/>
			</button>
		</div>
	);
};

export default ThemeSwitcher;
