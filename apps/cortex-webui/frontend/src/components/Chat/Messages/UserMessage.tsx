'use client';

import type React from 'react';
import { useState } from 'react';

interface UserMessageProps {
	message: any;
	onEdit?: (content: string) => void;
	onDelete?: () => void;
}

const UserMessage: React.FC<UserMessageProps> = ({ message, onEdit, onDelete }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState(message.content);

	const handleEdit = () => {
		setIsEditing(true);
	};

	const handleSave = () => {
		if (onEdit) {
			onEdit(editContent);
		}
		setIsEditing(false);
	};

	const handleCancel = () => {
		setEditContent(message.content);
		setIsEditing(false);
	};

	return (
		<div className="user-message">
			<div className="text-xs text-gray-500 flex justify-between">
				<span>You</span>
				{message.timestamp && (
					<span>
						{new Date(message.timestamp).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
						})}
					</span>
				)}
			</div>

			{isEditing ? (
				<div className="rounded px-2 py-1 bg-blue-100">
					<textarea
						value={editContent}
						onChange={(e) => setEditContent(e.target.value)}
						className="w-full p-2 border rounded"
						rows={3}
					/>
					<div className="flex justify-end space-x-2 mt-2">
						<button onClick={handleCancel} className="px-3 py-1 text-sm border rounded">
							Cancel
						</button>
						<button
							onClick={handleSave}
							className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
						>
							Save
						</button>
					</div>
				</div>
			) : (
				<div className="rounded px-2 py-1 bg-blue-100 whitespace-pre-wrap">
					{message.content}
					<div className="flex justify-end mt-1 space-x-2">
						<button onClick={handleEdit} className="text-xs text-gray-700 hover:text-gray-900">
							Edit
						</button>
						{onDelete && (
							<button onClick={onDelete} className="text-xs text-red-600 hover:text-red-800">
								Delete
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default UserMessage;
