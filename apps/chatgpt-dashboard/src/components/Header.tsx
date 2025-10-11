import * as React from 'react';

import { useTTL } from '../hooks/useTTL';

interface HeaderProps {
	ttlSeconds?: number;
	generatedAt?: string;
	onRefresh: () => void | Promise<void>;
	loading: boolean;
	refreshing: boolean;
	error?: string;
	connectorCount: number;
}

const formatTimestamp = (value?: string): string => {
	if (!value) return 'Waiting for manifest';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Waiting for manifest';
	return date.toLocaleString();
};

const statusBadge = (props: { error?: string; loading: boolean; count: number }) => {
	if (props.error) {
		return {
			text: props.error.slice(0, 80),
			className: 'bg-status-red-bg text-status-red',
		};
	}
	if (props.loading) {
		return {
			text: 'Loading connectors…',
			className: 'bg-neutral-100 text-neutral-600',
		};
	}
	return {
		text: `Connectors: ${props.count}`,
		className: 'bg-status-green-bg text-status-green',
	};
};

export function Header({
	ttlSeconds,
	generatedAt,
	onRefresh,
	loading,
	refreshing,
	error,
	connectorCount,
}: HeaderProps): React.ReactElement {
	const { ttl, label, urgent } = useTTL(ttlSeconds);
	const updatedLabel = React.useMemo(() => formatTimestamp(generatedAt), [generatedAt]);
	const badge = React.useMemo(() => statusBadge({ error, loading, count: connectorCount }), [error, loading, connectorCount]);

	return (
		<header className="sticky top-0 z-20 h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 lg:px-8 backdrop-blur supports-backdrop-blur:bg-white/80">
			<div className="flex items-center gap-4 lg:gap-6">
				<div className="hidden md:flex items-center gap-2 text-sm text-neutral-500">
					<span>Environment:</span>
					<span className="inline-flex items-center gap-2 bg-neutral-100 px-3 py-1.5 rounded-lg font-medium text-neutral-800">
						<span className="w-2 h-2 bg-status-green rounded-full" aria-hidden="true" />
						Production
					</span>
				</div>
				<span
					className={`text-xs font-mono font-medium px-3 py-1.5 rounded-lg transition ${ttl > 0 ? (urgent ? 'bg-status-red-bg text-status-red animate-pulse' : 'bg-neutral-100 text-neutral-700') : 'bg-neutral-100 text-neutral-600'}`}
				>
					<i className="fa-solid fa-clock mr-1" aria-hidden="true" />
					{label}
				</span>
				<span className={`text-xs font-medium px-3 py-1.5 rounded-full ${badge.className}`} aria-live="polite">
					<i className="fa-solid fa-diagram-project mr-1" aria-hidden="true" />
					{badge.text}
				</span>
			</div>
			<div className="flex-1 max-w-xl mx-6 hidden md:block">
				<div className="relative">
					<i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
					<input
						type="search"
						placeholder="Search agents, workflows or logs… (/)"
						className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
					/>
					<div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-mono">/</div>
				</div>
			</div>
			<div className="flex items-center gap-3">
				<span className="hidden lg:block text-xs text-neutral-500" aria-live="polite">
					Updated {updatedLabel}
				</span>
				<ButtonIcon
					icon={refreshing ? 'fa-spinner' : 'fa-arrows-rotate'}
					label="Refresh"
					onClick={onRefresh}
					disabled={refreshing}
					busy={refreshing}
				/>
				<ButtonIcon icon="fa-question-circle" label="Help" />
				<div className="relative">
					<ButtonIcon icon="fa-bell" label="Notifications" />
					<span className="absolute -top-1 -right-1 bg-status-red text-white text-[10px] w-5 h-5 rounded-full grid place-items-center">3</span>
				</div>
				<img
					src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg"
					alt="Operator avatar"
					className="w-8 h-8 rounded-full object-cover"
				/>
			</div>
		</header>
	);
}

interface ButtonIconProps {
	icon: string;
	label: string;
	onClick?: () => void | Promise<void>;
	disabled?: boolean;
	busy?: boolean;
}

function ButtonIcon({ icon, label, onClick, disabled, busy }: ButtonIconProps): React.ReactElement {
	const iconClass = busy ? 'fa-solid fa-spinner fa-spin' : `fa-solid ${icon}`;
	return (
		<button
			type="button"
			onClick={disabled ? undefined : onClick}
			disabled={disabled}
			className={`text-neutral-500 w-10 h-10 grid place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:text-neutral-800 hover:bg-neutral-100'}`}
			aria-label={label}
			aria-busy={busy}
		>
			<i className={iconClass} aria-hidden="true" />
		</button>
	);
}
