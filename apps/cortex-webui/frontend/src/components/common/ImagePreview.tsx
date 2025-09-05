'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';

interface ImagePreviewProps {
	show: boolean;
	src: string;
	alt?: string;
	onClose?: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
	show,
	src,
	alt = '',
	onClose,
}) => {
	const sceneElementRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && onClose) {
				onClose();
			}
		};

		if (show) {
			document.addEventListener('keydown', handleKeyDown);
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = 'unset';
		};
	}, [show, onClose]);

	const isAllowedRemoteHostname = (url: string) => {
		try {
			const parsed = new URL(url);
			const hostname = parsed.hostname.toLowerCase();
			// Allowlist: local dev hosts and known image CDNs (adjust as needed)
			const ALLOWED_HOSTS = [
				'localhost',
				'127.0.0.1',
				'::1',
				'images.cortex-os.dev',
				'cdn.cortex-os.com',
			];
			return ALLOWED_HOSTS.includes(hostname);
		} catch {
			return false;
		}
	};

	const safeFetch = (url: string) => {
		// semgrep-disable-next-line: semgrep.owasp-top-10-2021-a10-server-side-request-forgery
		return fetch(url);
	};

	const handleDownload = () => {
		if (src.startsWith('data:image/')) {
			const base64Data = src.split(',')[1];
			if (base64Data) {
				const byteCharacters = atob(base64Data);
				const byteNumbers = new Array(byteCharacters.length);
				for (let i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i);
				}
				const byteArray = new Uint8Array(byteNumbers);
				const blob = new Blob([byteArray], { type: 'image/png' });

				const mimeType = blob.type || 'image/png';
				const fileName = alt
					? `${alt.replaceAll('.', '')}.${mimeType.split('/')[1]}`
					: 'download.png';

				const link = document.createElement('a');
				link.href = URL.createObjectURL(blob);
				link.download = fileName;
				link.click();
			}
		} else if (src.startsWith('blob:')) {
			// Handle blob URLs
			// Blob URLs are considered safe when originated from the browser
			safeFetch(src)
				.then((response) => response.blob())
				.then((blob) => {
					const mimeType = blob.type || 'image/png';
					const fileName = alt
						? `${alt.replaceAll('.', '')}.${mimeType.split('/')[1]}`
						: 'download.png';

					const link = document.createElement('a');
					link.href = URL.createObjectURL(blob);
					link.download = fileName;
					link.click();
				})
				.catch((error) => {
					console.error('Error downloading blob:', error);
				});
		} else if (
			src.startsWith('/') ||
			src.startsWith('http://') ||
			src.startsWith('https://')
		) {
			// Handle remote URLs
			// Validate hostname against allowlist to prevent SSRF
			if (src.startsWith('http://') || src.startsWith('https://')) {
				if (!isAllowedRemoteHostname(src)) {
					console.warn('Blocked download from disallowed host:', src);
					return;
				}
			}

			safeFetch(src)
				.then((response) => response.blob())
				.then((blob) => {
					const mimeType = blob.type || 'image/png';
					const fileName = alt
						? `${alt.replaceAll('.', '')}.${mimeType.split('/')[1]}`
						: 'download.png';

					const link = document.createElement('a');
					link.href = URL.createObjectURL(blob);
					link.download = fileName;
					link.click();
				})
				.catch((error) => {
					console.error('Error downloading remote image:', error);
				});
		}
	};

	if (!show) {
		return null;
	}

	return (
		<div
			className="fixed top-0 right-0 left-0 bottom-0 bg-black text-white w-full min-h-screen h-screen flex justify-center z-50 overflow-hidden overscroll-contain"
			onClick={(e) => {
				if (e.target === e.currentTarget && onClose) {
					onClose();
				}
			}}
		>
			<div className="absolute left-0 w-full flex justify-between select-none z-20">
				<div>
					<button
						className="p-5"
						onClick={(e) => {
							e.stopPropagation();
							if (onClose) onClose();
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="size-6"
						>
							<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
						</svg>
					</button>
				</div>

				<div>
					<button
						className="p-5 z-50"
						onClick={(e) => {
							e.stopPropagation();
							handleDownload();
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="w-6 h-6"
						>
							<path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
							<path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
						</svg>
					</button>
				</div>
			</div>
			<div className="flex h-full max-h-full justify-center items-center z-0">
				<img
					ref={sceneElementRef}
					src={src}
					alt={alt}
					className="mx-auto h-full object-scale-down select-none"
					draggable="false"
				/>
			</div>
		</div>
	);
};

export default ImagePreview;
