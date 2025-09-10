'use client';

import type React from 'react';

interface SwitchProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label?: string;
	disabled?: boolean;
	className?: string;
}

const Switch: React.FC<SwitchProps> = ({
	checked,
	onChange,
	label,
	disabled = false,
	className = '',
}) => {
	return (
		<div className={`flex items-center ${className}`}>
			<button
				type="button"
				className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
					checked ? 'bg-blue-500' : 'bg-gray-200'
				} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
				onClick={() => !disabled && onChange(!checked)}
				disabled={disabled}
				role="switch"
				aria-checked={checked}
				aria-labelledby={label ? 'switch-label' : undefined}
			>
				<span
					aria-hidden="true"
					className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
						checked ? 'translate-x-5' : 'translate-x-0'
					}`}
				/>
			</button>
			{label && (
				<span
					id="switch-label"
					className={`ml-3 text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}
				>
					{label}
				</span>
			)}
		</div>
	);
};

export default Switch;
