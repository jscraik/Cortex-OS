'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	title?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
	className?: string;
}

const Modal: React.FC<ModalProps> = ({
	isOpen,
	onClose,
	children,
	title,
	size = 'md',
	className = '',
}) => {
	const modalRef = useRef<HTMLDivElement>(null);

	// Handle escape key press
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = 'unset';
		};
	}, [isOpen, onClose]);

	// Handle click outside modal
	const handleClickOutside = (e: React.MouseEvent) => {
		if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
			onClose();
		}
	};

	// Size classes
	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		full: 'max-w-full',
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				className="fixed inset-0 bg-black bg-opacity-50"
				onClick={handleClickOutside}
			/>

			<div
				ref={modalRef}
				className={`relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto ${className}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? 'modal-title' : undefined}
			>
				{title && (
					<div className="p-4 border-b flex justify-between items-center">
						<h3
							id="modal-title"
							className="text-lg font-semibold text-gray-900"
						>
							{title}
						</h3>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-500"
							aria-label="Close"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				)}

				<div className="p-4">{children}</div>
			</div>
		</div>
	);
};

export default Modal;
