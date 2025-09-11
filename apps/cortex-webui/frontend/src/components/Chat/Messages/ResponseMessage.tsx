'use client';

import type React from 'react';
import { useState } from 'react';
import ContentRenderer from './ContentRenderer';
import FollowUps from './ResponseMessage/FollowUps';
import RegenerateMenu from './ResponseMessage/RegenerateMenu';

interface ResponseMessageProps {
	message: any;
	onEdit?: (content: string) => void;
	onDelete?: () => void;
	onRegenerate?: () => void;
	onBranch?: () => void;
}

const ResponseMessage: React.FC<ResponseMessageProps> = ({
	message,
	onEdit,
	onDelete,
	onRegenerate,
	onBranch,
}) => {
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
		<div className="response-message">
			<div className="text-xs text-gray-500 flex justify-between">
				<span>{message.model || 'Assistant'}</span>
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
				<div className="rounded px-2 py-1 bg-gray-100">
					<textarea
						value={editContent}
						onChange={(e) => setEditContent(e.target.value)}
						className="w-full p-2 border rounded"
						rows={3}
					/>
					<div className="flex justify-end space-x-2 mt-2">
						<button
							onClick={handleCancel}
							className="px-3 py-1 text-sm border rounded"
						>
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
				<div className="rounded px-2 py-1 bg-gray-100">
					<ContentRenderer
						content={message.content}
						citations={message.citations || []}
						codeBlocks={message.codeBlocks || []}
						executions={message.executions || []}
						webSearchResults={message.webSearchResults || []}
					/>

					<div className="flex justify-end mt-1 space-x-2">
						<button
							onClick={handleEdit}
							className="text-xs text-gray-500 hover:text-gray-700"
						>
							Edit
						</button>
						{onDelete && (
							<button
								onClick={onDelete}
								className="text-xs text-red-500 hover:text-red-700"
							>
								Delete
							</button>
						)}
					</div>
				</div>
			)}

			{message.followUps && message.followUps.length > 0 && (
				<FollowUps followUps={message.followUps} />
			)}

			<RegenerateMenu
				onRegenerate={onRegenerate}
				onBranch={onBranch}
				onEdit={handleEdit}
			/>
		</div>
	);
};

export default ResponseMessage;
