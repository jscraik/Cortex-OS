'use client';

import type React from 'react';

interface ProfileImageProps {
	name: string;
	isUser?: boolean;
}

const ProfileImage: React.FC<ProfileImageProps> = ({
	name,
	isUser = false,
}) => {
	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	if (isUser) {
		return (
			<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
				{getInitials(name)}
			</div>
		);
	}

	return (
		<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-sm font-medium">
			{getInitials(name)}
		</div>
	);
};

export default ProfileImage;
