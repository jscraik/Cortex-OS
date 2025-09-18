'use client';

import type React from 'react';

interface NameProps {
	name: string;
	isUser?: boolean;
}

const Name: React.FC<NameProps> = ({ name, isUser = false }) => {
	return <div className={`text-xs ${isUser ? 'text-blue-600' : 'text-gray-500'}`}>{name}</div>;
};

export default Name;
