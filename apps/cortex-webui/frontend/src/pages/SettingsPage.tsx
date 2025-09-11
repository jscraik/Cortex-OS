import type React from 'react';
import Header from '../components/Layout/Header';
import SettingsComponent from '../components/Settings/SettingsPage';

interface SettingsPageProps {
	theme: 'light' | 'dark';
	onThemeChange: (theme: 'light' | 'dark') => void;
	onToggleSidebar: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
	theme,
	onThemeChange,
	onToggleSidebar,
}) => {
	return (
		<div className="flex h-screen bg-gray-100">
			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				<Header title="Settings" onToggleSidebar={onToggleSidebar} />
				<main className="flex-1 overflow-y-auto">
					<SettingsComponent theme={theme} onThemeChange={onThemeChange} />
				</main>
			</div>
		</div>
	);
};

export default SettingsPage;
