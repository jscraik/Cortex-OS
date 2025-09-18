'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface VideoInputMenuProps {
	devices: MediaDeviceInfo[];
	onChange: (deviceId: string) => void;
	children: React.ReactNode;
}

const VideoInputMenu: React.FC<VideoInputMenuProps> = ({ devices, onChange, children }) => {
	const [show, setShow] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Handle click outside to close dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setShow(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	return (
		<div ref={dropdownRef} className="relative">
			<div onClick={() => setShow(!show)}>{children}</div>

			{show && (
				<div
					className="absolute bottom-full left-0 mb-2 w-full max-w-[180px] rounded-lg px-1 py-1.5 border border-gray-300/30 dark:border-gray-700/50 z-50 bg-white dark:bg-gray-900 dark:text-white shadow-lg"
					style={{ transform: 'translateY(-6px)' }}
				>
					{devices.map((device) => (
						<div
							key={device.deviceId}
							className="flex gap-2 items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
							onClick={() => {
								onChange(device.deviceId);
								setShow(false);
							}}
						>
							<div className="flex items-center">
								<div className="line-clamp-1">{device.label || 'Camera'}</div>
							</div>
						</div>
					))}

					{/* Screen share option */}
					<div
						className="flex gap-2 items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
						onClick={() => {
							onChange('screen');
							setShow(false);
						}}
					>
						<div className="flex items-center">
							<div className="line-clamp-1">Screen Share</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default VideoInputMenu;
