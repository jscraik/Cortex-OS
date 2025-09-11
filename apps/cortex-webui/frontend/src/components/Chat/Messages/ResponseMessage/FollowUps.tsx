'use client';

import type React from 'react';

interface FollowUp {
	id: string;
	text: string;
}

interface FollowUpsProps {
	followUps: FollowUp[];
}

const FollowUps: React.FC<FollowUpsProps> = ({ followUps }) => {
	if (followUps.length === 0) return null;

	return (
		<div className="follow-ups mt-2">
			<h4 className="text-xs font-medium text-gray-700 mb-1">
				Related Questions
			</h4>
			<div className="flex flex-wrap gap-2">
				{followUps.map((followUp) => (
					<button
						key={followUp.id}
						className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100"
					>
						{followUp.text}
					</button>
				))}
			</div>
		</div>
	);
};

export default FollowUps;
