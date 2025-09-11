'use client';

import type React from 'react';
import NotificationsContainer from '../NotificationsContainer';
import Sidebar from './Sidebar';

interface LayoutProps {
	children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar />
			<main className="flex-1 flex flex-col overflow-hidden">{children}</main>
			<NotificationsContainer />
		</div>
	);
};

export default Layout;
