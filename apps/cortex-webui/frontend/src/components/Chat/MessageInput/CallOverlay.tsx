'use client';

// Move FallbackProfileImage outside of CallOverlay
const FallbackProfileImage = ({ profileImageUrl }: { profileImageUrl: string }) => (
	<img
		src={profileImageUrl}
		alt="Profile"
		className="rounded-full size-12 object-cover"
		style={{ width: '3.5rem', height: '3.5rem' }}
	/>
);
'use client';

import { useEffect, useRef, useState } from 'react';
import notificationStore from '../../../utils/notification-store';
import VideoInputMenu from './CallOverlay/VideoInputMenu';

interface CallOverlayProps {
	model: { info?: { meta?: { profile_image_url?: string } } };
	onClose: () => void;
}

import { useId } from 'react';

const CallOverlay: React.FC<CallOverlayProps> = ({ model, onClose }) => {
	// Stub missing functions and variables
	const startRecording = () => {};
	const stopCamera = () => {};
	const stopAudioStream = () => {};
	const stopResponse = () => {};
	const stopRecordingCallback = (_: boolean) => {};
	// Use a simple event target for demo purposes
	const eventTarget = typeof window !== 'undefined' ? window : ({} as any);
		const [wakeLock] = useState<any>(null);
	const [loading] = useState(false);
	const [assistantSpeaking, setAssistantSpeaking] = useState(false);
	const [emoji, setEmoji] = useState<string | null>(null);
	const [camera] = useState(false);
	const [chatStreaming, setChatStreaming] = useState(false);
	const [rmsLevel] = useState(0);

	const cameraFeedRef = useRef<HTMLVideoElement>(null);
	const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
	const audioElementRef = useRef<HTMLAudioElement>(null);
	const audioElementId = useId();
	// ...existing code...


	// Finished messages tracking
	const finishedMessages = useRef<Record<string, boolean>>({});
	const currentMessageId = useRef<string | null>(null);
	const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

	// Speak using speech synthesis
	// Removed unused _speakSpeechSynthesisHandler

	// Play audio
	const playAudio = (audio: HTMLAudioElement) => {
		return new Promise<void>((resolve) => {
			if (audioElementRef.current) {
				audioElementRef.current.src = audio.src;
				audioElementRef.current.muted = true;
				audioElementRef.current.playbackRate = 1;

				audioElementRef.current
					.play()
					.then(() => {
						audioElementRef.current!.muted = false;
					})
					.catch((error) => {
						console.error(error);
					});

				audioElementRef.current.onended = async () => {
					await new Promise((r) => setTimeout(r, 100));
					resolve();
				};
			}
		});
	};

	// Stop all audio
	const stopAllAudio = async () => {
		setAssistantSpeaking(false);

		if (chatStreaming) {
			stopResponse();
		}

		if (currentUtterance.current) {
			speechSynthesis.cancel();
			currentUtterance.current = null;
		}

		if (audioElementRef.current) {
			audioElementRef.current.muted = true;
			audioElementRef.current.pause();
			audioElementRef.current.currentTime = 0;
		}
	};

	// Audio abort controller
	const audioAbortController = useRef<AbortController>(new AbortController());

	// Audio cache
	const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
	const emojiCache = useRef<Map<string, string>>(new Map());

	// Fetch audio
	const fetchAudio = async (content: string) => {
		if (!audioCache.current.has(content)) {
			try {
				// In a real implementation, you would generate an emoji
				// For now, we'll skip emoji generation

				// In a real implementation, you would synthesize speech
				// For now, we'll create a mock audio element
				const mockAudio = new Audio(); // Empty audio element
				audioCache.current.set(content, mockAudio);
			} catch (error) {
				console.error('Error synthesizing speech:', error);
			}
		}

		return audioCache.current.get(content);
	};

	// Messages tracking
	const messages = useRef<Record<string, string[]>>({});

	// Monitor and play audio
	const monitorAndPlayAudio = async (id: string, signal: AbortSignal) => {
		while (!signal.aborted) {
			if (messages.current[id] && messages.current[id].length > 0) {
				// Retrieve the next content string from the queue
				const content = messages.current[id].shift(); // Dequeues the content for playing

				if (content && audioCache.current.has(content)) {
					// If content is available in the cache, play it

					// Set the emoji for the content if available
					if (emojiCache.current.has(content)) {
						setEmoji(emojiCache.current.get(content) || null);
					} else {
						setEmoji(null);
					}

					try {
						console.log(
							'%c%s',
							'color: red; font-size: 20px;',
							`Playing audio for content: ${content}`,
						);

						const audio = audioCache.current.get(content);
						if (audio) {
							await playAudio(audio); // Here ensure that playAudio is indeed correct method to execute
							console.log(`Played audio for content: ${content}`);
							await new Promise((r) => setTimeout(r, 200)); // Wait before retrying to reduce tight loop
						}
					} catch (error) {
						console.error('Error playing audio:', error);
					}
				} else if (content) {
					// If not available in the cache, push it back to the queue and delay
					if (messages.current[id]) {
						messages.current[id].unshift(content); // Re-queue the content at the start
					}
					console.log(
						`Audio for "${content}" not yet available in the cache, re-queued...`,
					);
					await new Promise((r) => setTimeout(r, 200)); // Wait before retrying to reduce tight loop
				}
			} else if (
				finishedMessages.current[id] &&
				messages.current[id] &&
				messages.current[id].length === 0
			) {
				// If the message is finished and there are no more messages to process, break the loop
				setAssistantSpeaking(false);
				break;
			} else {
				// No messages to process, sleep for a bit
				await new Promise((r) => setTimeout(r, 200));
			}
		}
		console.log(`Audio monitoring and playing stopped for message ID ${id}`);
	};

	// Chat start handler
	const chatStartHandler = async (e: CustomEvent) => {
		const { id } = e.detail;

		setChatStreaming(true);

		if (currentMessageId.current !== id) {
			console.log(`Received chat start event for message ID ${id}`);

			currentMessageId.current = id;
			if (audioAbortController.current) {
				audioAbortController.current.abort();
			}
			audioAbortController.current = new AbortController();

			setAssistantSpeaking(true);
			// Start monitoring and playing audio for the message ID
			monitorAndPlayAudio(id, audioAbortController.current.signal);
		}
	};

	// Chat event handler
	const chatEventHandler = async (e: CustomEvent) => {
		const { id, content } = e.detail;
		// "id" here is message id
		// if "id" is not the same as "currentMessageId" then do not process
		// "content" here is a sentence from the assistant,
		// there will be many sentences for the same "id"

		if (currentMessageId.current === id) {
			console.log(`Received chat event for message ID ${id}: ${content}`);

			try {
				if (messages.current[id] === undefined) {
					messages.current[id] = [content];
				} else {
					messages.current[id].push(content);
				}

				console.log(content);

				fetchAudio(content);
			} catch (error) {
				console.error('Failed to fetch or play audio:', error);
			}
		}
	};

	// Chat finish handler
	const chatFinishHandler = async (e: CustomEvent) => {
		const { id } = e.detail;
		// "content" here is the entire message from the assistant
		finishedMessages.current[id] = true;

		setChatStreaming(false);
	};

	// Set wake lock
	const setWakeLockHandler = async () => {
			if ('wakeLock' in navigator) {
				try {
					await navigator.wakeLock.request('screen');
				} catch (err) {
					// The Wake Lock request has failed - usually system related, such as battery.
					console.log(err);
				}
			}
	};

	// Handle visibility change
	const handleVisibilityChange = async () => {
		if (wakeLock !== null && document.visibilityState === 'visible') {
			await setWakeLockHandler();
		}
	};

	// Effect for mounting
	useEffect(() => {
		const init = async () => {
			// Set wake lock
			await setWakeLockHandler();

			// Add visibility change listener
					document.addEventListener('visibilitychange', handleVisibilityChange);

					// Start recording
					startRecording();

					// Add event listeners
					eventTarget.addEventListener('chat:start', (e: any) =>
						chatStartHandler(e as CustomEvent),
					);
					eventTarget.addEventListener('chat', (e: any) =>
						chatEventHandler(e as CustomEvent),
					);
					eventTarget.addEventListener('chat:finish', (e: any) =>
						chatFinishHandler(e as CustomEvent),
					);
		};

		init();

		// Cleanup function
		return () => {
			stopAllAudio();
			stopAudioStream();

			// Remove event listeners
					eventTarget.removeEventListener('chat:start', (e: any) =>
						chatStartHandler(e as CustomEvent),
					);
					eventTarget.removeEventListener('chat', (e: any) =>
						chatEventHandler(e as CustomEvent),
					);
					eventTarget.removeEventListener('chat:finish', (e: any) =>
						chatFinishHandler(e as CustomEvent),
					);

			if (audioAbortController.current) {
				audioAbortController.current.abort();
			}

			stopAllAudio();
			stopRecordingCallback(false);
			stopCamera();

			// Remove visibility change listener
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [
		chatEventHandler,
		chatFinishHandler,
		chatStartHandler,
		eventTarget.addEventListener,
		eventTarget.removeEventListener,
		handleVisibilityChange,
		setWakeLockHandler, // Start recording
		startRecording,
		stopAllAudio,
		stopAudioStream,
		stopCamera,
		stopRecordingCallback,
	]);

	// Effect for unmounting
	useEffect(() => {
		return () => {
			stopAllAudio();
			stopRecordingCallback(false);
			stopCamera();

			stopAudioStream();
					eventTarget.removeEventListener('chat:start', (e: any) =>
						chatStartHandler(e as CustomEvent),
					);
					eventTarget.removeEventListener('chat', (e: any) =>
						chatEventHandler(e as CustomEvent),
					);
					eventTarget.removeEventListener('chat:finish', (e: any) =>
						chatFinishHandler(e as CustomEvent),
					);

			if (audioAbortController.current) {
				audioAbortController.current.abort();
			}

			stopAllAudio();
		};
	}, [
		chatEventHandler,
		chatFinishHandler,
		chatStartHandler,
		eventTarget.removeEventListener,
		stopAllAudio,
		stopAudioStream,
		stopCamera,
		stopRecordingCallback,
	]);

	return (
				<div className="max-w-lg w-full h-full max-h-[100dvh] flex flex-col justify-between p-3 md:p-6">
					{/* Top emoji/camera/loader/fallback profile image */}
											<div className="flex justify-center items-center w-full h-20 min-h-20">
												{camera ? (
													<button
														type="button"
														className="flex justify-center items-center w-full h-20 min-h-20"
														onClick={() => {
															if (assistantSpeaking) {
																stopAllAudio();
															}
														}}
													>
														{emoji ? (
															<div
																className="transition-all rounded-full"
																style={{ fontSize: `${rmsLevel * 100 > 4 ? '4.5' : rmsLevel * 100 > 2 ? '4.25' : rmsLevel * 100 > 1 ? '3.75' : '3.5'}rem`, width: '100%', textAlign: 'center' }}
															>
																{emoji}
															</div>
														) : loading || assistantSpeaking ? (
															<svg
																className="size-12 text-gray-900 dark:text-gray-400"
																viewBox="0 0 24 24"
																fill="currentColor"
																xmlns="http://www.w3.org/2000/svg"
															>
																<title>Loading spinner</title>
																<style>
																	{`
																		.spinner_qM83 {
																			animation: spinner_8HQG 1.05s infinite;
																		}
																		.spinner_oXPr {
																			animation-delay: 0.1s;
																		}
																		.spinner_ZTLf {
																			animation-delay: 0.2s;
																		}
																		@keyframes spinner_8HQG {
																			0%,
																			57.14% {
																				animation-timing-function: cubic-bezier(0.33, 0.66, 0.66, 1);
																				transform: translate(0);
																			}
																			28.57% {
																				animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0.33);
																				transform: translateY(-6px);
																			}
																			100% {
																				transform: translate(0);
																			}
																		}
																	`}
																</style>
																<circle className="spinner_qM83" cx="4" cy="12" r="3" />
																<circle className="spinner_qM83 spinner_oXPr" cx="12" cy="12" r="3" />
																<circle className="spinner_qM83 spinner_ZTLf" cx="20" cy="12" r="3" />
															</svg>
														) : (
															<FallbackProfileImage profileImageUrl={model?.info?.meta?.profile_image_url ?? '/static/favicon.png'} />
														)}
													</button>
												) : emoji ? (
													<div
														className="transition-all rounded-full"
														style={{ fontSize: `${rmsLevel * 100 > 4 ? '13' : rmsLevel * 100 > 2 ? '12' : rmsLevel * 100 > 1 ? '11.5' : '11'}rem`, width: '100%', textAlign: 'center' }}
													>
														{emoji}
													</div>
												) : loading || assistantSpeaking ? (
													<svg
														className="size-44 text-gray-900 dark:text-gray-400"
														viewBox="0 0 24 24"
														fill="currentColor"
														xmlns="http://www.w3.org/2000/svg"
													>
														<title>Loading spinner</title>
														<style>
															{`
																.spinner_qM83 {
																	animation: spinner_8HQG 1.05s infinite;
																}
																.spinner_oXPr {
																	animation-delay: 0.1s;
																}
																.spinner_ZTLf {
																	animation-delay: 0.2s;
																}
																@keyframes spinner_8HQG {
																	0%,
																	57.14% {
																		animation-timing-function: cubic-bezier(0.33, 0.66, 0.66, 1);
																		transform: translate(0);
																	}
																	28.57% {
																		animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0.33);
																		transform: translateY(-6px);
																	}
																	100% {
																		transform: translate(0);
																	}
																}
															`}
														</style>
														<circle className="spinner_qM83" cx="4" cy="12" r="3" />
														<circle className="spinner_qM83 spinner_oXPr" cx="12" cy="12" r="3" />
														<circle className="spinner_qM83 spinner_ZTLf" cx="20" cy="12" r="3" />
													</svg>
												) : (
													<FallbackProfileImage profileImageUrl={model?.info?.meta?.profile_image_url ?? '/static/favicon.png'} />
												)}
											</div>

			<div className="flex justify-center items-center flex-1 h-full w-full max-h-full">
				{!camera ? (
					<button
						type="button"
						onClick={() => {
							if (assistantSpeaking) {
								stopAllAudio();
							}
						}}
					>
						{emoji ? (
							<div
								className="transition-all rounded-full"
								style={{
									fontSize: `${
										rmsLevel * 100 > 4
											? '13'
											: rmsLevel * 100 > 2
												? '12'
												: rmsLevel * 100 > 1
													? '11.5'
													: '11'
									}rem`,
									width: '100%',
									textAlign: 'center',
								}}
							>
								{emoji}
							</div>
						) : loading || assistantSpeaking ? (
							<svg
								className="size-44 text-gray-900 dark:text-gray-400"
								viewBox="0 0 24 24"
								fill="currentColor"
								xmlns="http://www.w3.org/2000/svg"
							>
								<title>Loading spinner</title>
								<style>
									{`
										.spinner_qM83 {
											animation: spinner_8HQG 1.05s infinite;
										}
										.spinner_oXPr {
											animation-delay: 0.1s;
										}
										.spinner_ZTLf {
											animation-delay: 0.2s;
										}
										@keyframes spinner_8HQG {
											0%,
											57.14% {
												animation-timing-function: cubic-bezier(0.33, 0.66, 0.66, 1);
												transform: translate(0);
											}
											28.57% {
												animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0.33);
												transform: translateY(-6px);
											}
											100% {
												transform: translate(0);
											}
										}
									`}
								</style>
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
						) : (
							getFallbackProfileImageDiv()
						)}
					</button>
				) : (
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
				)}
			</div>

			<div className="flex justify-between items-center pb-2 w-full">
				<div>
					{camera ? (
						<VideoInputMenu
							devices={videoInputDevices}
							onChange={async (deviceId: string) => {
								console.log(deviceId);
								setSelectedVideoInputDeviceId(deviceId);
								await stopVideoStream();
								await startVideoStream();
							}}
						>
							<button
								className="p-3 rounded-full bg-gray-50 dark:bg-gray-900"
								type="button"
							>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													className="size-5"
												>
													<title>Camera</title>
									<path
										fillRule="evenodd"
										d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
										clipRule="evenodd"
									/>
								</svg>
							</button>
						</VideoInputMenu>
					) : (
						<button
							className="p-3 rounded-full bg-gray-50 dark:bg-gray-900"
							type="button"
							onClick={async () => {
								try {
									await navigator.mediaDevices.getUserMedia({ video: true });
									startCamera();
								} catch (error) {
									console.error('Error accessing camera:', error);
									notificationStore.addNotification({
										type: 'error',
										message: 'Failed to access camera',
									});
								}
							}}
						>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={1.5}
												stroke="currentColor"
												className="size-5"
											>
												<title>Camera</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
								/>
							</svg>
						</button>
					)}
				</div>

				<div>
					<button
						type="button"
						onClick={() => {
							if (assistantSpeaking) {
								stopAllAudio();
							}
						}}
					>
						<div className="line-clamp-1 text-sm font-medium">
							{loading
								? 'Thinking...'
								: assistantSpeaking
									? 'Tap to interrupt'
									: 'Listening...'}
						</div>
					</button>
				</div>

				<div>
					<button
						className="p-3 rounded-full bg-gray-50 dark:bg-gray-900"
						onClick={async () => {
							await stopAudioStream();
							await stopVideoStream();

							console.log(audioStream);
							console.log(cameraStream);

							onClose();
						}}
						type="button"
					>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											className="size-5"
										>
											<title>Close overlay</title>
							<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
						</svg>
					</button>
				</div>
			</div>
	<audio id={audioElementId} ref={audioElementRef} style={{ display: 'none' }}>
		<track kind="captions" label="English captions" srcLang="en" />
	</audio>;
	</div>
	)
};

export default CallOverlay;
