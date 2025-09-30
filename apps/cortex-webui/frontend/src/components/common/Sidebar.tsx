'use client';

import type React from 'react';

interface SidebarProps {
	show: boolean;
	side?: 'left' | 'right';
	width?: string;
	className?: string;
	duration?: number;
	onClose?: () => void;
	children: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({
	show,
	side = 'right',
	width = '200px',
	className = '',
	duration = 100,
	onClose,
	children,
}) => {
	if (!show) {
		return <>{children}</>;
	}

	return (
		<>
			{/* Backdrop */}
			<button
				type="button"
				aria-label="Close sidebar"
				className="absolute z-20 top-0 right-0 left-0 bottom-0 bg-white/20 dark:bg-black/5 w-full min-h-full h-full flex justify-center overflow-hidden overscroll-contain appearance-none border-0"
				onClick={onClose}
				style={{
					animation: `fadeIn ${duration}ms ease-out forwards`,
				}}
			/>

			{/* Sidebar */}
			<div
				className={`absolute z-30 shadow-xl ${side === 'right' ? 'right-0' : 'left-0'} top-0 bottom-0`}
				style={{
					animation: `slideIn${side === 'right' ? 'X' : 'Y'} ${duration}ms ease-out forwards`,
					width: show ? width : '0px',
				}}
			>
				<div className={`${className} h-full`}>{children}</div>
			</div>

			<style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInX {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @keyframes slideInY {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
		</>
	);
};

export default Sidebar;
