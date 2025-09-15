'use client';

import Modal from '@/components/common/Modal';
import type React from 'react';
import { useId, useState } from 'react';

interface Tag {
	id: string;
	name: string;
	color: string;
}

interface TagChatModalProps {
	isOpen: boolean;
	onClose: () => void;
	chatTitle: string;
	initialTags: Tag[];
	onTagsUpdate: (tags: Tag[]) => void;
}

const TagChatModal: React.FC<TagChatModalProps> = ({
	isOpen,
	onClose,
	chatTitle,
	initialTags,
	onTagsUpdate,
}) => {
	const [tags, setTags] = useState<Tag[]>(initialTags);
	const [newTag, setNewTag] = useState('');
	const [selectedColor, setSelectedColor] = useState('#3b82f6'); // Default blue

	const newTagInputId = useId();

	const predefinedColors = [
		'#3b82f6', // blue
		'#10b981', // green
		'#f59e0b', // yellow
		'#ef4444', // red
		'#8b5cf6', // purple
		'#ec4899', // pink
		'#06b6d4', // cyan
		'#84cc16', // lime
	];

	const addTag = () => {
		if (newTag.trim() === '') return;

		const tag: Tag = {
			id: Math.random().toString(36).substring(2, 11),
			name: newTag.trim(),
			color: selectedColor,
		};

		setTags([...tags, tag]);
		setNewTag('');
	};

	const removeTag = (id: string) => {
		setTags(tags.filter((tag) => tag.id !== id));
	};

	const handleSave = () => {
		onTagsUpdate(tags);
		onClose();

		// @ts-expect-error - window.addNotification is added by external script
		if (typeof window !== 'undefined' && window.addNotification) {
			// @ts-expect-error - window.addNotification is added by external script
			window.addNotification('success', 'Tags updated successfully!');
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Tag Chat">
			<div className="p-6">
				<div className="space-y-6">
					<div>
						<h3 className="text-lg font-medium text-gray-900 dark:text-white">
							Tag "{chatTitle}"
						</h3>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Add or remove tags to organize your chats.
						</p>
					</div>

					<div>
						<label
							htmlFor={newTagInputId}
							className="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Add New Tag
						</label>
						<div className="mt-1 flex">
							<input
								type="text"
								id={newTagInputId}
								value={newTag}
								onChange={(e) => setNewTag(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && addTag()}
								placeholder="Enter tag name"
								className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							/>
							<button
								type="button"
								onClick={addTag}
								className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
							>
								Add
							</button>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Tag Color
						</label>
						<div className="flex space-x-2">
							{predefinedColors.map((color) => (
								<button
									key={color}
									type="button"
									onClick={() => setSelectedColor(color)}
									className={`w-8 h-8 rounded-full border-2 ${
										selectedColor === color
											? 'border-gray-900 dark:border-white'
											: 'border-gray-300 dark:border-gray-600'
									}`}
									style={{ backgroundColor: color }}
									aria-label={`Select color ${color}`}
								/>
							))}
						</div>
					</div>

					{tags.length > 0 && (
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Current Tags
							</label>
							<div className="flex flex-wrap gap-2">
								{tags.map((tag) => (
									<div
										key={tag.id}
										className="flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
										style={{ backgroundColor: tag.color }}
									>
										{tag.name}
										<button
											type="button"
											onClick={() => removeTag(tag.id)}
											className="ml-2 text-white hover:text-gray-200 focus:outline-none"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												className="size-4"
											>
												<title>Remove tag</title>
												<path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
											</svg>
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					<div className="flex justify-end space-x-3">
						<button
							type="button"
							onClick={onClose}
							className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Save Tags
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
};

export default TagChatModal;
