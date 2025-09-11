'use client';

import type React from 'react';
import Spinner from '@/components/common/Spinner';

interface OverlayProps {
	show: boolean;
	content?: string;
	opacity?: number;
	children: React.ReactNode;
}

const Overlay: React.FC<OverlayProps> = ({
	show,
	content = '',
	opacity = 1,
	children,
}) => {
	if (!show) {
		return <>{children}</>;
	}

	return (
		<div className="relative">
			<div className="absolute w-full h-full flex">
				<div
					className="absolute rounded-sm"
					style={{
						inset: '-10px',
						opacity: opacity,
						backdropFilter: 'blur(5px)',
					}}
				/>

				<div className="flex w-full flex-col justify-center">
					<div className="py-3">
						<Spinner className="ml-2" />
					</div>

					{content !== '' && (
						<div className="text-center text-gray-100 text-xs font-medium z-50">
							{content}
						</div>
					)}
				</div>
			</div>

			{children}
		</div>
	);
};

export default Overlay;
