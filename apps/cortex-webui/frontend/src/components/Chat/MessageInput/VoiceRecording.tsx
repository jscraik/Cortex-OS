'use client';

import React, { useRef, useState } from 'react';

interface VoiceRecordingProps {
	onRecordingComplete: (audioBlob: Blob) => void;
	onCancel: () => void;
}

const VoiceRecording: React.FC<VoiceRecordingProps> = ({ onRecordingComplete, onCancel }) => {
	const [isRecording, setIsRecording] = useState(false);
	const [recordingTime, setRecordingTime] = useState(0);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(audioChunksRef.current, {
					type: 'audio/webm',
				});
				onRecordingComplete(audioBlob);
				stream.getTracks().forEach((track) => track.stop());
			};

			mediaRecorder.start();
			setIsRecording(true);
			setRecordingTime(0);

			timerRef.current = setInterval(() => {
				setRecordingTime((prev) => prev + 1);
			}, 1000);
		} catch (error) {
			console.error('Error accessing microphone:', error);
			onCancel();
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
			setIsRecording(false);

			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}
	};

	const cancelRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
			setIsRecording(false);

			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}
		onCancel();
	};

	React.useEffect(() => {
		startRecording();

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, [startRecording]);

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-96">
				<h3 className="text-lg font-semibold mb-4">Voice Recording</h3>

				<div className="flex flex-col items-center mb-4">
					<div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-4 animate-pulse">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8 text-white"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
								clipRule="evenodd"
							/>
						</svg>
					</div>

					<div className="text-2xl font-mono">
						{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
					</div>

					<div className="mt-2 text-sm text-gray-500">
						{isRecording ? 'Recording...' : 'Processing...'}
					</div>
				</div>

				<div className="flex justify-center gap-4">
					<button
						onClick={cancelRecording}
						className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
					>
						Cancel
					</button>
					<button
						onClick={stopRecording}
						disabled={!isRecording}
						className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
					>
						Stop
					</button>
				</div>
			</div>
		</div>
	);
};

export default VoiceRecording;
