'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import NotificationToast from './NotificationToast';

interface Notification {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	message: string;
	timestamp: number;
}

const NotificationsContainer: React.FC = () => {
	const [notifications, setNotifications] = useState<Notification[]>([]);

	// Function to add a new notification
	const addNotification = (
		type: 'success' | 'error' | 'warning' | 'info',
		message: string,
	) => {
		const id = Math.random().toString(36).substr(2, 9);
		const newNotification: Notification = {
			id,
			type,
			message,
			timestamp: Date.now(),
		};

		setNotifications((prev) => [...prev, newNotification]);
	};

	// Function to remove a notification
	const removeNotification = (id: string) => {
		setNotifications((prev) =>
			prev.filter((notification) => notification.id !== id),
		);
	};

	// Expose addNotification to global scope for easy access
	useEffect(() => {
		// @ts-expect-error - adding custom method to window object
		window.addNotification = addNotification;

		return () => {
			// @ts-expect-error - deleting custom method from window object
			delete window.addNotification;
		};
	}, [addNotification]);

	return (
		<div className="fixed top-4 right-4 z-50 space-y-2">
			{notifications.map((notification) => (
				<NotificationToast
					key={notification.id}
					id={notification.id}
					type={notification.type}
					message={notification.message}
					onClose={removeNotification}
				/>
			))}
		</div>
	);
};

export default NotificationsContainer;
