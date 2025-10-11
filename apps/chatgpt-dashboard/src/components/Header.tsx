import * as React from 'react';

import { useTTL } from '../hooks/useTTL';

export function Header(): React.ReactElement {
	const { label, urgent, ttl } = useTTL(120);

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
				{ttl > 0 && (
					<span
						className={`text-xs font-mono font-medium px-3 py-1.5 rounded-lg transition ${urgent ? 'bg-status-red-bg text-status-red animate-pulse' : 'bg-neutral-100 text-neutral-700'}`}
					>
						<i className="fa-solid fa-clock mr-1" aria-hidden="true" />
						{label}
					</span>
				)}
				<button
					id="incidents-pill"
					type="button"
					className="bg-status-green-bg text-status-green text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-2"
				>
					<i className="fa-solid fa-shield-check" aria-hidden="true" />
					Incidents: 0
				</button>
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
				<ButtonIcon icon="fa-arrows-rotate" label="Refresh" />
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
}

function ButtonIcon({ icon, label }: ButtonIconProps): React.ReactElement {
	return (
		<button
			type="button"
			className="text-neutral-500 hover:text-neutral-800 w-10 h-10 grid place-items-center rounded-full hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
			aria-label={label}
		>
			<i className={`fa-solid ${icon}`} aria-hidden="true" />
		</button>
	);
}
