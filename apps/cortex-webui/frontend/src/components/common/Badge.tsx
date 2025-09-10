'use client';

import type React from 'react';

interface BadgeProps {
	children: React.ReactNode;
	variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

const Badge: React.FC<BadgeProps> = ({
	children,
	variant = 'primary',
	size = 'md',
	className = '',
}) => {
	const variantClasses = {
		primary: 'bg-blue-100 text-blue-800',
		secondary: 'bg-gray-100 text-gray-800',
		success: 'bg-green-100 text-green-800',
		warning: 'bg-yellow-100 text-yellow-800',
		error: 'bg-red-100 text-red-800',
		info: 'bg-indigo-100 text-indigo-800',
	};

	const sizeClasses = {
		sm: 'px-2 py-0.5 text-xs',
		md: 'px-2.5 py-0.5 text-sm',
		lg: 'px-3 py-1 text-base',
	};

	return (
		<span
			className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
		>
			{children}
		</span>
	);
};

export default Badge;
