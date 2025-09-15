'use client';

import type React from 'react';
import { useRef, useState } from 'react';

interface CallOverlayProps {
	model: {
		info?: {
			meta?: {
				profile_image_url?: string;
			};
		};
	};
}

export const FallbackProfileImage = ({
	profileImageUrl,
}: {
	profileImageUrl: string;
}) => (
	<img
		src={profileImageUrl}
		alt="Profile"
		className="rounded-full size-12 object-cover"
		style={{ width: '3.5rem', height: '3.5rem' }}
	/>
);

const CallOverlay: React.FC<CallOverlayProps> = ({ model }) => {
	const [camera] = useState(false);
	const [emoji] = useState<string | null>(null);
	const [loading] = useState(false);
	const [assistantSpeaking] = useState(false);
	const [rmsLevel] = useState(0);
	const cameraFeedRef = useRef<HTMLVideoElement>(null);
	const cameraCanvasRef = useRef<HTMLCanvasElement>(null);

	const stopAllAudio = () => {};
	const stopCamera = () => {};

	const renderMainContent = () => {
		if (!camera) {
			let content: React.ReactElement;
			let fontSize: string;
			const rms = rmsLevel * 100;
			if (rms > 4) {
				fontSize = '13';
			} else if (rms > 2) {
				fontSize = '12';
			} else if (rms > 1) {
				fontSize = '11.5';
			} else {
				fontSize = '11';
			}
			if (emoji) {
				content = (
					<div
						className="transition-all rounded-full"
						style={{
							fontSize: `${fontSize}rem`,
							width: '100%',
							textAlign: 'center',
						}}
					>
						{emoji}
					</div>
				);
			} else if (loading || assistantSpeaking) {
				content = (
					<svg
						className="size-44 text-gray-900 dark:text-gray-400"
						viewBox="0 0 24 24"
						fill="currentColor"
						xmlns="http://www.w3.org/2000/svg"
					>
						<title>Loading spinner</title>
						<style>{`.spinner_qM83 {animation: spinner_8HQG 1.05s infinite;} .spinner_oXPr {animation-delay: 0.1s;} .spinner_ZTLf {animation-delay: 0.2s;} @keyframes spinner_8HQG {0%,57.14% {animation-timing-function: cubic-bezier(0.33,0.66,0.66,1);transform: translate(0);}28.57% {animation-timing-function: cubic-bezier(0.33,0,0.66,0.33);transform: translateY(-6px);}100% {transform: translate(0);}}`}</style>
						<circle className="spinner_qM83" cx="4" cy="12" r="3" />
						<circle
							className="spinner_qM83 spinner_oXPr"
							cx="12"
							cy="12"
							r="3"
						/>
						<circle
							className="spinner_qM83 spinner_ZTLf"
							cx="20"
							cy="12"
							r="3"
						/>
					</svg>
				);
			} else {
				content = (
					<FallbackProfileImage
						profileImageUrl={
							model?.info?.meta?.profile_image_url ?? '/static/favicon.png'
						}
					/>
				);
			}
			return (
				<button
					type="button"
					onClick={() => {
						if (assistantSpeaking) {
							stopAllAudio();
						}
					}}
				>
					{content}
				</button>
			);
		} else {
			return (
				<div className="relative flex video-container w-full max-h-full pt-2 pb-4 md:py-6 px-2 h-full">
					<video
						ref={cameraFeedRef}
						autoPlay
						className="rounded-2xl h-full min-w-full object-cover object-center"
						playsInline
					>
						<track kind="captions" label="English captions" srcLang="en" />
					</video>
					<canvas ref={cameraCanvasRef} style={{ display: 'none' }} />
					<div className="absolute top-4 md:top-8 left-4">
						<button
							type="button"
							className="p-1.5 text-white cursor-pointer backdrop-blur-xl bg-black/10 rounded-full"
							onClick={() => {
								stopCamera();
							}}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 16 16"
								fill="currentColor"
								className="size-6"
							>
								<title>Close camera</title>
								<path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
							</svg>
						</button>
					</div>
				</div>
			);
		}
	};

	return (
		<div className="max-w-lg w-full h-full max-h-[100dvh] flex flex-col justify-between p-3 md:p-6">
			{/* Top emoji/camera/loader/fallback profile image */}
			<div className="flex justify-center items-center w-full h-20 min-h-20">
				{renderMainContent()}
			</div>
			{/* Add other valid JSX children here as needed */}
		</div>
	);
};

export default CallOverlay;
