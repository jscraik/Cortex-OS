'use client';

import type { Token } from 'marked';
import type React from 'react';
import MarkdownTokens from './MarkdownTokens';

type AlertType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

interface AlertTheme {
	border: string;
	text: string;
	icon: React.ReactNode;
}

interface AlertData {
	type: AlertType;
	text: string;
	tokens: Token[];
}

const alertStyles: Record<AlertType, AlertTheme> = {
	NOTE: {
		border: 'border-sky-500',
		text: 'text-sky-500',
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				className="inline-block size-4"
			>
				<path
					fillRule="evenodd"
					d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
					clipRule="evenodd"
				/>
			</svg>
		),
	},
	TIP: {
		border: 'border-emerald-500',
		text: 'text-emerald-500',
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				className="inline-block size-4"
			>
				<path
					fillRule="evenodd"
					d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.5 5.5 0 0 1 5.5 5.5v.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-.5A5.5 5.5 0 0 1 10 12Z"
					clipRule="evenodd"
				/>
			</svg>
		),
	},
	IMPORTANT: {
		border: 'border-purple-500',
		text: 'text-purple-500',
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				className="inline-block size-4"
			>
				<path
					fillRule="evenodd"
					d="M10 2l.836 1.672a1 1 0 0 1 .158.687l-.158.687L10 7l-.836-2.454a1 1 0 0 1-.158-.687l.158-.687L10 2Zm3.31 4.91L15 5.24a1 1 0 0 0-.34-1.34l-1.67-1.67a1 1 0 0 0-1.34-.34L10 3.59l-1.67-1.67a1 1 0 0 0-1.34.34L5.24 5.24a1 1 0 0 0-.34 1.34L6.59 8.25 5.24 9.92a1 1 0 0 0 .34 1.34l1.67 1.67a1 1 0 0 0 1.34.34L10 11.41l1.67 1.67a1 1 0 0 0 1.34-.34l1.67-1.67a1 1 0 0 0 .34-1.34L13.31 8.25l1.67-1.67a1 1 0 0 0-.34-1.34l-1.67-1.67a1 1 0 0 0-1.34-.34L10 5.59l-1.67-1.67a1 1 0 0 0-1.34.34L5.24 5.24a1 1 0 0 0-.34 1.34L6.59 8.25 5.24 9.92a1 1 0 0 0 .34 1.34l1.67 1.67a1 1 0 0 0 1.34.34L10 11.41l1.67 1.67a1 1 0 0 0 1.34-.34l1.67-1.67a1 1 0 0 0 .34-1.34L13.31 8.25Z"
					clipRule="evenodd"
				/>
			</svg>
		),
	},
	WARNING: {
		border: 'border-yellow-500',
		text: 'text-yellow-500',
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				className="inline-block size-4"
			>
				<path
					fillRule="evenodd"
					d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 8 8.22 4.03a.75.75 0 0 1 0-1.06Z"
					clipRule="evenodd"
				/>
				<path d="M3.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
			</svg>
		),
	},
	CAUTION: {
		border: 'border-rose-500',
		text: 'text-rose-500',
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				className="inline-block size-4"
			>
				<path d="M3.28 2.22a.75.75 0 0 0-1.06 1.06L4.94 6 2.22 8.72a.75.75 0 1 0 1.06 1.06L6 7.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L7.06 6l2.72-2.72a.75.75 0 0 0-1.06-1.06L6 4.94 3.28 2.22Z" />
				<path d="M15.78 10.22a.75.75 0 0 0-1.06 0L12.44 12l-2.28-2.28a.75.75 0 1 0-1.06 1.06L11.94 14l-2.28 2.28a.75.75 0 1 0 1.06 1.06L12.44 16l2.28 2.28a.75.75 0 1 0 1.06-1.06L13.06 14l2.28-2.28a.75.75 0 0 0 0-1.06l-2.28 2.28-2.28-2.28a.75.75 0 0 0-1.06 1.06L11.94 14l-2.28 2.28a.75.75 0 1 0 1.06 1.06L12.44 16l2.28 2.28a.75.75 0 1 0 1.06-1.06L13.06 14l2.28-2.28a.75.75 0 0 0 0-1.06Z" />
			</svg>
		),
	},
};

export function alertComponent(token: Token): AlertData | false {
	const regExpStr = `^(?:\\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\\])\\s*?\n*`;
	const regExp = new RegExp(regExpStr);
	const matches = token.text?.match(regExp);

	if (matches?.length) {
		const alertType = matches[1] as AlertType;
		const newText = token.text.replace(regExp, '');
		// In a real implementation, you would need to parse the newText into tokens
		// For now, we'll create a simple token array
		const newTokens: Token[] = [
			{
				type: 'text',
				raw: newText,
				text: newText,
			},
		];

		return {
			type: alertType,
			text: newText,
			tokens: newTokens,
		};
	}
	return false;
}

interface AlertRendererProps {
	token: Token;
	alert: AlertData;
	id?: string;
	tokenIdx?: number;
	onTaskClick?: (event: React.MouseEvent) => void;
	onSourceClick?: (event: React.MouseEvent) => void;
}

const AlertRenderer: React.FC<AlertRendererProps> = ({
	token,
	alert,
	id = '',
	tokenIdx = 0,
	onTaskClick,
	onSourceClick,
}) => {
	return (
		<div className={`border-l-4 pl-2.5 ${alertStyles[alert.type].border} my-0.5`}>
			<div className={`${alertStyles[alert.type].text} items-center flex gap-1 py-1.5`}>
				{alertStyles[alert.type].icon}
				<span className="font-medium">{alert.type}</span>
			</div>
			<div className="pb-2">
				<MarkdownTokens
					id={`${id}-${tokenIdx}`}
					tokens={alert.tokens}
					onTaskClick={onTaskClick}
					onSourceClick={onSourceClick}
				/>
			</div>
		</div>
	);
};

export default AlertRenderer;
