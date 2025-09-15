'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';

interface FilesOverlayProps {
	show: boolean;
	showSidebar: boolean;
	onDrop?: (files: File[]) => void;
	onDragLeave?: () => void;
}

const FilesOverlay: React.FC<FilesOverlayProps> = ({
	show,
	showSidebar,
	onDrop,
	onDragLeave,
}) => {
	const overlayElementRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (show && overlayElementRef.current) {
			document.body.appendChild(overlayElementRef.current);
			document.body.style.overflow = 'hidden';
		} else if (overlayElementRef.current?.parentNode) {
			document.body.removeChild(overlayElementRef.current);
			document.body.style.overflow = 'unset';
		}

		// Cleanup function
		return () => {
			if (overlayElementRef.current?.parentNode) {
				document.body.removeChild(overlayElementRef.current);
				document.body.style.overflow = 'unset';
			}
		};
	}, [show]);

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();

		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0 && onDrop) {
			onDrop(files);
		}
	};

	const handleDragLeave = (e: React.DragEvent) => {
		// Only trigger leave when leaving the overlay entirely
		if (e.currentTarget === e.target && onDragLeave) {
			onDragLeave();
		}
	};

	if (!show) {
		return null;
	}

	return (
		<div
			ref={overlayElementRef}
			className={`fixed ${
				showSidebar
					? 'left-0 md:left-[260px] md:w-[calc(100%-260px)]'
					: 'left-0'
			} fixed top-0 right-0 bottom-0 w-full h-full flex z-50 pointer-events-auto`}
			id="dropzone"
			role="region"
			aria-label="Drag and Drop Container"
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onDragLeave={handleDragLeave}
		>
			<div className="absolute w-full h-full backdrop-blur-sm bg-gray-800/50 dark:bg-gray-900/70 flex justify-center border-4 border-dashed border-blue-400 dark:border-blue-500">
				<div className="m-auto pt-64 flex flex-col justify-center items-center text-center">
					<div className="max-w-md p-8 bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-lg">
						<div className="w-16 h-16 mx-auto mb-4 text-blue-500 dark:text-blue-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={1.5}
								stroke="currentColor"
								className="w-16 h-16"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.25a2.25 2.25 0 0 0-2.25 2.25v10.5a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25V9.75a2.25 2.25 0 0 0-2.25-2.25H18"
								/>
							</svg>
						</div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
							Drop files here
						</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
							Release to upload your files
						</p>
						<div className="text-xs text-gray-500 dark:text-gray-500">
							Supported: PDF, TXT, DOC, DOCX, Images, and more
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default FilesOverlay;
