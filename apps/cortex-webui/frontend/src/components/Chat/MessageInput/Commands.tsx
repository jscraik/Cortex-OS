'use client';

import type React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Spinner from '../../common/Spinner';
import Knowledge from './Commands/Knowledge';
import Models from './Commands/Models';
import Prompts from './Commands/Prompts';

interface CommandsProps {
	show: boolean;
	command: string;
	onSelect: (data: { type: string; data: unknown }) => void;
	onUpload: (data: { type: string; files: File[] }) => void;
	insertTextHandler: (text: string) => void;
}

const Commands: React.FC<CommandsProps> = ({
	show,
	command,
	onSelect,
	onUpload,
	insertTextHandler,
}) => {
	const _uniqueId = useId();
	const [loading, setLoading] = useState(false);
	// Use a more specific type for the ref
	type CommandElementRefType = {
		selectUp: () => void;
		selectDown: () => void;
	} | null;
	const commandElementRef = useRef<CommandElementRefType>(null);

	const init = useCallback(async () => {
		setLoading(true);
		// In a real implementation, you would fetch prompts and knowledge bases
		// For now, we'll simulate with a timeout
		await new Promise((resolve) => setTimeout(resolve, 500));
		setLoading(false);
	}, []);

	// Initialize data when component is shown
	useEffect(() => {
		if (show) {
			void init();
		}
	}, [show, init]);

	// Public methods for parent components to control selection
	const selectUp = useCallback(() => {
		if (commandElementRef.current) {
			commandElementRef.current.selectUp();
		}
	}, []);

	const selectDown = useCallback(() => {
		if (commandElementRef.current) {
			commandElementRef.current.selectDown();
		}
	}, []);

	// Expose methods to parent component
	useEffect(() => {
		// This is a simplified way to expose methods to parent
		// In a real implementation, you might use a callback or context
		if (typeof window !== 'undefined') {
			(
				window as unknown as {
					commandsSelectUp?: () => void;
					commandsSelectDown?: () => void;
				}
			).commandsSelectUp = selectUp;
			(
				window as unknown as {
					commandsSelectUp?: () => void;
					commandsSelectDown?: () => void;
				}
			).commandsSelectDown = selectDown;
		}

		return () => {
			if (typeof window !== 'undefined') {
				delete (
					window as unknown as {
						commandsSelectUp?: () => void;
						commandsSelectDown?: () => void;
					}
				).commandsSelectUp;
				delete (
					window as unknown as {
						commandsSelectUp?: () => void;
						commandsSelectDown?: () => void;
					}
				).commandsSelectDown;
			}
		};
	}, [selectUp, selectDown]);

	if (!show) {
		return null;
	}

	if (loading) {
		return (
			<div
				id={`commands-container-${_uniqueId}`}
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
	if (command?.startsWith('/')) {
		return (
			<Prompts
				ref={commandElementRef}
				command={command}
				onSelect={(data: { type: string; data: { content: string } }) => {
					const { type, data: promptData } = data;

					if (type === 'prompt') {
						insertTextHandler(promptData.content);
					}
				}}
			/>
		);
	} else if (
		(command?.startsWith('#') && !command.includes('# ')) ||
		(command?.startsWith('\\#') && !command.includes('# '))
	) {
		return (
			<Knowledge
				ref={commandElementRef}
				command={command.includes('\\#') ? command.slice(2) : command}
				onSelect={(data: { type: string; data: unknown }) => {
					const { type, data: knowledgeData } = data;

					if (type === 'knowledge') {
						insertTextHandler('');
						onUpload({
							type: 'file',
							files: Array.isArray(knowledgeData) ? knowledgeData : [],
						});
					} else if (type === 'youtube') {
						insertTextHandler('');
						onUpload({
							type: 'youtube',
							files: Array.isArray(knowledgeData) ? knowledgeData : [],
						});
					} else if (type === 'web') {
						insertTextHandler('');
						onUpload({
							type: 'web',
							files: Array.isArray(knowledgeData) ? knowledgeData : [],
						});
					}
				}}
			/>
		);
	} else if (command?.startsWith('@')) {
		return (
			<Models
				ref={commandElementRef}
				command={command}
				onSelect={(data: { type: string; data: unknown }) => {
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
