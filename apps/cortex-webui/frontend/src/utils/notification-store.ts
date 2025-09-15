export interface Notification {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	message: string;
	duration?: number;
}

import { generateId } from './id';

export interface NotificationStoreApi {
	addNotification: (notification: Omit<Notification, 'id'>) => string;
	removeNotification: (id: string) => void;
	clearAll: () => void;
}

export class NotificationStore {
	private notifications: Notification[] = [];
	private listeners: ((notifications: Notification[]) => void)[] = [];

	subscribe(listener: (notifications: Notification[]) => void) {
		this.listeners.push(listener);
		listener(this.notifications);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	private notify(): void {
		this.listeners.forEach((listener) => {
			listener([...this.notifications]);
		});
	}

	addNotification(notification: Omit<Notification, 'id'>) {
		const newNotification: Notification = {
			id: generateId(),
			...notification,
		};

		this.notifications = [...this.notifications, newNotification];
		this.notify();

		// Auto-remove notification after duration
		if (newNotification.duration !== 0) {
			setTimeout(() => {
				this.removeNotification(newNotification.id);
			}, newNotification.duration || 5000);
		}

		return newNotification.id;
	}

	removeNotification(id: string) {
		this.notifications = this.notifications.filter(
			(notification) => notification.id !== id,
		);
		this.notify();
	}

	clearAll() {
		this.notifications = [];
		this.notify();
	}
}

const notificationStore: NotificationStoreApi = new NotificationStore();

export function addNotification(
	notification: Omit<Notification, 'id'>,
): string {
	return notificationStore.addNotification(notification);
}

export function removeNotification(id: string): void {
	notificationStore.removeNotification(id);
}

export function clearNotifications(): void {
	notificationStore.clearAll();
}

export default notificationStore;
