'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DragGhostProps {
	x: number;
	y: number;
	show: boolean;
	children: React.ReactNode;
}

const DragGhost: React.FC<DragGhostProps> = ({ x, y, show, children }) => {
	const popupElementRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (show && popupElementRef.current) {
			document.body.appendChild(popupElementRef.current);
			document.body.style.overflow = 'hidden';
		}

		return () => {
			if (popupElementRef.current?.parentNode) {
				popupElementRef.current.parentNode.removeChild(popupElementRef.current);
			}
			document.body.style.overflow = 'unset';
		};
	}, [show]);

	if (!show) {
		return null;
	}

	return createPortal(
		<div
			ref={popupElementRef}
			className="fixed top-0 left-0 w-screen h-[100dvh] z-50 touch-none pointer-events-none"
		>
			<div
				className="absolute text-white z-[99999]"
				style={{ top: `${y + 10}px`, left: `${x + 10}px` }}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
};

export default DragGhost;
