'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import Spinner from '../../common/Spinner';
import Knowledge from './Commands/Knowledge';
import Models from './Commands/Models';
import Prompts from './Commands/Prompts';

interface CommandsProps {
	show: boolean;
	files: any[];
	command: string;
	onSelect: (data: any) => void;
	onUpload: (data: any) => void;
	insertTextHandler: (text: string) => void;
}

const Commands: React.FC<CommandsProps> = ({
	show,
	files,
	command,
	onSelect,
	onUpload,
	insertTextHandler,
}) => {
	const [loading, setLoading] = useState(false);
	const commandElementRef = useRef<any>(null);

	// Initialize data when component is shown
	useEffect(() => {
		if (show) {
			init();
		}
	}, [show, init]);

	const init = async () => {
		setLoading(true);
		// In a real implementation, you would fetch prompts and knowledge bases
		// For now, we'll simulate with a timeout
		await new Promise((resolve) => setTimeout(resolve, 500));
		setLoading(false);
	};

	// Public methods for parent components to control selection
	const selectUp = () => {
		if (commandElementRef.current) {
			commandElementRef.current.selectUp();
		}
	};

	const selectDown = () => {
		if (commandElementRef.current) {
			commandElementRef.current.selectDown();
		}
	};

	// Expose methods to parent component
	useEffect(() => {
		// This is a simplified way to expose methods to parent
		// In a real implementation, you might use a callback or context
		if (typeof window !== 'undefined') {
			(window as any).commandsSelectUp = selectUp;
			(window as any).commandsSelectDown = selectDown;
		}

		return () => {
			if (typeof window !== 'undefined') {
				delete (window as any).commandsSelectUp;
				delete (window as any).commandsSelectDown;
			}
		};
	}, [selectDown, selectUp]);

	if (!show) {
		return null;
	}

	if (loading) {
		return (
			<div
				id="commands-container"
				className="px-2 mb-2 text-left w-full absolute bottom-0 left-0 right-0 z-10"
			>
				<div className="flex w-full rounded-xl border border-gray-100 dark:border-gray-850">
					<div className="max-h-60 flex flex-col w-full rounded-xl bg-white dark:bg-gray-900 dark:text-gray-100">
						<Spinner />
					</div>
				</div>
			</div>
		);
	}

	// Render different components based on command type
	if (command?.charAt(0) === '/') {
		return (
			<Prompts
				ref={commandElementRef}
				command={command}
				onSelect={(data: any) => {
					const { type, data: promptData } = data;

					if (type === 'prompt') {
						insertTextHandler(promptData.content);
					}
				}}
			/>
		);
	} else if (
		(command?.charAt(0) === '#' &&
			command.startsWith('#') &&
			!command.includes('# ')) ||
		('\\#' === command.slice(0, 2) &&
			command.startsWith('#') &&
			!command.includes('# '))
	) {
		return (
			<Knowledge
				ref={commandElementRef}
				command={command.includes('\\#') ? command.slice(2) : command}
				onSelect={(data: any) => {
					const { type, data: knowledgeData } = data;

					if (type === 'knowledge') {
						insertTextHandler('');
						onUpload({
							type: 'file',
							data: knowledgeData,
						});
					} else if (type === 'youtube') {
						insertTextHandler('');
						onUpload({
							type: 'youtube',
							data: knowledgeData,
						});
					} else if (type === 'web') {
						insertTextHandler('');
						onUpload({
							type: 'web',
							data: knowledgeData,
						});
					}
				}}
			/>
		);
	} else if (command?.charAt(0) === '@') {
		return (
			<Models
				ref={commandElementRef}
				command={command}
				onSelect={(data: any) => {
					const { type, data: modelData } = data;

					if (type === 'model') {
						insertTextHandler('');
						onSelect({
							type: 'model',
							data: modelData,
						});
					}
				}}
			/>
		);
	}

	return null;
};

export default Commands;
