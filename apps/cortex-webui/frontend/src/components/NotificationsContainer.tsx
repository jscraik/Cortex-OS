'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import type {
	Notification,
	NotificationStore,
} from '../utils/notification-store';
import notificationStore from '../utils/notification-store';
import NotificationToast from './NotificationToast';

const NotificationsContainer: React.FC = () => {
	const [notifications, setNotifications] = useState<Notification[]>([]);

	useEffect(() => {
		const store = notificationStore as unknown as NotificationStore;
		const unsubscribe = store.subscribe((notifications: Notification[]) => {
			setNotifications(notifications);
		});

		return () => unsubscribe();
	}, []);

	const handleDismiss = (id: string) => {
		notificationStore.removeNotification(id);
	};

	return (
		<div className="fixed top-0 right-0 z-50 space-y-2 p-4">
			{notifications.map((notification) => (
				<NotificationToast
					key={notification.id}
					notification={notification}
					onDismiss={handleDismiss}
				/>
			))}
		</div>
	);
};

export default NotificationsContainer;
