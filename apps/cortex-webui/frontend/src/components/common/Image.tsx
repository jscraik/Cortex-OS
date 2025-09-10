'use client';

import type React from 'react';
import { useState } from 'react';
import ImagePreview from '@/components/common/ImagePreview';

interface ImageProps {
	src: string;
	alt?: string;
	className?: string;
	imageClassName?: string;
	dismissible?: boolean;
	onDismiss?: () => void;
}

const Image: React.FC<ImageProps> = ({
	src,
	alt = '',
	className = 'w-full',
	imageClassName = 'rounded-lg',
	dismissible = false,
	onDismiss,
}) => {
	const [showImagePreview, setShowImagePreview] = useState(false);
	const baseUrl = process.env.NEXT_PUBLIC_WEBUI_BASE_URL || '';
	const imageUrl = src.startsWith('/') ? `${baseUrl}${src}` : src;

	return (
		<>
			<ImagePreview
				show={showImagePreview}
				src={imageUrl}
				alt={alt}
				onClose={() => setShowImagePreview(false)}
			/>

			<div className="relative group w-fit flex items-center">
				<button
					className={className}
					onClick={() => setShowImagePreview(true)}
					aria-label="Show image preview"
					type="button"
				>
					<img
						src={imageUrl}
						alt={alt}
						className={imageClassName}
						draggable="false"
					/>
				</button>

				{dismissible && (
					<div className="absolute -top-1 -right-1">
						<button
							aria-label="Remove image"
							className="bg-white text-black border border-white rounded-full group-hover:visible invisible transition"
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								if (onDismiss) onDismiss();
							}}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								className="size-4"
							>
								<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
							</svg>
						</button>
					</div>
				)}
			</div>
		</>
	);
};

export default Image;
