'use client';

import type React from 'react';
import { useEffect, useState } from 'react';

interface Notification {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	message: string;
	duration?: number;
}

interface NotificationToastProps {
	notification: Notification;
	onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
	const [isVisible, setIsVisible] = useState(true);
	const [isLeaving, setIsLeaving] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLeaving(true);
			setTimeout(() => {
				setIsVisible(false);
				onDismiss(notification.id);
			}, 300);
		}, notification.duration || 5000);

		return () => clearTimeout(timer);
	}, [notification.duration, notification.id, onDismiss]);

	if (!isVisible) return null;

	const getTypeStyles = () => {
		switch (notification.type) {
			case 'success':
				return 'bg-green-500 text-white';
			case 'error':
				return 'bg-red-500 text-white';
			case 'warning':
				return 'bg-yellow-500 text-white';
			case 'info':
				return 'bg-blue-500 text-white';
			default:
				return 'bg-gray-500 text-white';
		}
	};

	return (
		<div
			className={`fixed top-4 right-4 z-50 p-4 rounded shadow-lg transform transition-all duration-300 ease-in-out ${getTypeStyles()} ${isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
		>
			<div className="flex items-start">
				<span className="flex-1">{notification.message}</span>
				<button
					onClick={() => {
						setIsLeaving(true);
						setTimeout(() => {
							setIsVisible(false);
							onDismiss(notification.id);
						}, 300);
					}}
					className="ml-4 text-white hover:text-gray-200 focus:outline-none"
					aria-label="Dismiss notification"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clipRule="evenodd"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
};

export default NotificationToast;
