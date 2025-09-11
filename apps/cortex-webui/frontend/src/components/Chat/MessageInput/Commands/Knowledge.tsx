'use client';

import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from 'react';
import { isValidHttpUrl } from '../../../../utils/validation';

interface KnowledgeItem {
	id: string;
	name: string;
	description: string;
	type: 'file' | 'collection' | 'note';
	legacy?: boolean;
	meta?: any;
}

interface KnowledgeProps {
	command: string;
	onSelect: (data: { type: string; data: any }) => void;
}

const Knowledge = forwardRef(({ command, onSelect }: KnowledgeProps, ref) => {
	const [selectedIdx, setSelectedIdx] = useState(0);
	const [filteredItems, setFilteredItems] = useState<KnowledgeItem[]>([]);
	const [items, setItems] = useState<KnowledgeItem[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);
	const adjustHeightDebounce = useRef<NodeJS.Timeout | null>(null);

	// Mock knowledge data - in a real implementation, this would come from a store or API
	const mockKnowledge: KnowledgeItem[] = [
		{
			id: '1',
			name: 'Project Documentation',
			description: 'Technical documentation for the project',
			type: 'file',
		},
		{
			id: '2',
			name: 'API Reference',
			description: 'API reference guide',
			type: 'file',
		},
		{
			id: '3',
			name: 'User Guide',
			description: 'User guide for the application',
			type: 'file',
		},
		{
			id: '4',
			name: 'Development Notes',
			description: 'Notes on development process',
			type: 'note',
		},
		{
			id: '5',
			name: 'Research Papers',
			description: 'Collection of research papers',
			type: 'collection',
		},
	];

	// Filter items based on command
	useEffect(() => {
		const filtered = command.slice(1)
			? mockKnowledge.filter(
					(item) =>
						item.name.toLowerCase().includes(command.slice(1).toLowerCase()) ||
						item.description
							.toLowerCase()
							.includes(command.slice(1).toLowerCase()),
				)
			: mockKnowledge;

		setFilteredItems(filtered);
		setSelectedIdx(0);
	}, [command]);

	// Initialize items
	useEffect(() => {
		setItems(mockKnowledge);
	}, []);

	// Adjust container height
	const adjustHeight = () => {
		if (containerRef.current) {
			if (adjustHeightDebounce.current) {
				clearTimeout(adjustHeightDebounce.current);
			}

			adjustHeightDebounce.current = setTimeout(() => {
				if (!containerRef.current) return;

				// Ensure the container is visible before adjusting height
				const rect = containerRef.current.getBoundingClientRect();
				containerRef.current.style.maxHeight =
					Math.max(Math.min(240, rect.bottom - 100), 100) + 'px';
			}, 100);
		}
	};

	// Handle window resize
	useEffect(() => {
		window.addEventListener('resize', adjustHeight);

		adjustHeight();

		return () => {
			window.removeEventListener('resize', adjustHeight);
			if (adjustHeightDebounce.current) {
				clearTimeout(adjustHeightDebounce.current);
			}
		};
	}, []);

	// Confirm selection
	const confirmSelect = (type: string, data: any) => {
		onSelect({ type, data });
	};

	// Decode string
	const decodeString = (str: string) => {
		try {
			return decodeURIComponent(str);
		} catch (e) {
			return str;
		}
	};

	// Expose methods to parent component
	useImperativeHandle(ref, () => ({
		selectUp: () => {
			setSelectedIdx((prev) => Math.max(0, prev - 1));
		},
		selectDown: () => {
			setSelectedIdx((prev) => Math.min(prev + 1, filteredItems.length - 1));
		},
	}));

	if (filteredItems.length === 0 && !command.substring(1).startsWith('http')) {
		return null;
	}

	return (
		<div
			id="commands-container"
			className="px-2 mb-2 text-left w-full absolute bottom-0 left-0 right-0 z-10"
		>
			<div className="flex w-full rounded-xl border border-gray-100 dark:border-gray-850">
				<div className="flex flex-col w-full rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100">
					<div
						className="m-1 overflow-y-auto p-1 rounded-r-xl space-y-0.5 scrollbar-hidden max-h-60"
						id="command-options-container"
						ref={containerRef}
					>
						{filteredItems.map((item, idx) => (
							<button
								key={idx}
								className={`px-3 py-1.5 rounded-xl w-full text-left flex justify-between items-center ${
									idx === selectedIdx
										? 'bg-gray-50 dark:bg-gray-850 dark:text-gray-100 selected-command-option-button'
										: ''
								}`}
								type="button"
								onClick={() => {
									console.log(item);
									confirmSelect('knowledge', item);
								}}
								onMouseMove={() => {
									setSelectedIdx(idx);
								}}
							>
								<div>
									<div className="font-medium text-black dark:text-gray-100 flex items-center gap-1">
										{item.legacy ? (
											<div className="bg-gray-500/20 text-gray-700 dark:text-gray-200 rounded-sm uppercase text-xs font-bold px-1 shrink-0">
												Legacy
											</div>
										) : item?.meta?.document ? (
											<div className="bg-gray-500/20 text-gray-700 dark:text-gray-200 rounded-sm uppercase text-xs font-bold px-1 shrink-0">
												Document
											</div>
										) : item?.type === 'file' ? (
											<div className="bg-gray-500/20 text-gray-700 dark:text-gray-200 rounded-sm uppercase text-xs font-bold px-1 shrink-0">
												File
											</div>
										) : item?.type === 'note' ? (
											<div className="bg-blue-500/20 text-blue-700 dark:text-blue-200 rounded-sm uppercase text-xs font-bold px-1 shrink-0">
												Note
											</div>
										) : (
											<div className="bg-green-500/20 text-green-700 dark:text-green-200 rounded-sm uppercase text-xs font-bold px-1 shrink-0">
												Collection
											</div>
										)}

										<div className="line-clamp-1">
											{decodeString(item?.name)}
										</div>
									</div>

									<div className="text-xs text-gray-600 dark:text-gray-100 line-clamp-1">
										{item?.description}
									</div>
								</div>
							</button>
						))}

						{command.substring(1).startsWith('https://www.youtube.com') ||
						command.substring(1).startsWith('https://youtu.be') ? (
							<button
								className="px-3 py-1.5 rounded-xl w-full text-left bg-gray-50 dark:bg-gray-850 dark:text-gray-100 selected-command-option-button"
								type="button"
								onClick={() => {
									if (isValidHttpUrl(command.substring(1))) {
										confirmSelect('youtube', command.substring(1));
									} else {
										// In a real implementation, you would show a toast notification
										console.error('Invalid URL');
									}
								}}
							>
								<div className="font-medium text-black dark:text-gray-100 line-clamp-1">
									{command.substring(1)}
								</div>
								<div className="text-xs text-gray-600 line-clamp-1">
									Youtube
								</div>
							</button>
						) : command.substring(1).startsWith('http') ? (
							<button
								className="px-3 py-1.5 rounded-xl w-full text-left bg-gray-50 dark:bg-gray-850 dark:text-gray-100 selected-command-option-button"
								type="button"
								onClick={() => {
									if (isValidHttpUrl(command.substring(1))) {
										confirmSelect('web', command.substring(1));
									} else {
										// In a real implementation, you would show a toast notification
										console.error('Invalid URL');
									}
								}}
							>
								<div className="font-medium text-black dark:text-gray-100 line-clamp-1">
									{command}
								</div>
								<div className="text-xs text-gray-600 line-clamp-1">Web</div>
							</button>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
});

Knowledge.displayName = 'Knowledge';

export default Knowledge;
