'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import notificationStore from '../../../utils/notification-store';
import VideoInputMenu from './CallOverlay/VideoInputMenu';

interface CallOverlayProps {
	eventTarget: EventTarget;
	submitPrompt: (text: string, options?: any) => Promise<any>;
	stopResponse: () => void;
	files: any[];
	chatId: string;
	modelId: string;
	model: any;
	onClose: () => void;
}

const CallOverlay: React.FC<CallOverlayProps> = ({
	eventTarget,
	submitPrompt,
	stopResponse,
	files: _files, // Mark as unused with underscore prefix
	chatId: _chatId, // Mark as unused with underscore prefix
	modelId: _modelId, // Mark as unused with underscore prefix
	model,
	onClose,
}) => {
	const [wakeLock, setWakeLock] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [confirmed, setConfirmed] = useState(false);
	const [interrupted, setInterrupted] = useState(false);
	const [assistantSpeaking, setAssistantSpeaking] = useState(false);
	const [emoji, setEmoji] = useState<string | null>(null);
	const [camera, setCamera] = useState(false);
	const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
	const [chatStreaming, setChatStreaming] = useState(false);
	const [rmsLevel, setRmsLevel] = useState(0);
	const [hasStartedSpeaking, setHasStartedSpeaking] = useState(false);
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
		null,
	);
	const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
	const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
	const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>(
		[],
	);
	const [selectedVideoInputDeviceId, setSelectedVideoInputDeviceId] = useState<
		string | null
	>(null);

	const cameraFeedRef = useRef<HTMLVideoElement>(null);
	const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
	const audioElementRef = useRef<HTMLAudioElement>(null);

	// Get video input devices
	const getVideoInputDevices = async () => {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(
				(device) => device.kind === 'videoinput',
			);

			// Add screen share option if supported
			if (navigator.mediaDevices.getDisplayMedia) {
				// We'll handle screen sharing separately
			}

			setVideoInputDevices(videoDevices);

			if (!selectedVideoInputDeviceId && videoDevices.length > 0) {
				setSelectedVideoInputDeviceId(videoDevices[0].deviceId);
			}
		} catch (error) {
			console.error('Error getting video input devices:', error);
		}
	};

	// Start camera
	const startCamera = async () => {
		await getVideoInputDevices();

		if (!cameraStream) {
			setCamera(true);
			try {
				await startVideoStream();
			} catch (err) {
				console.error('Error accessing webcam: ', err);
				notificationStore.addNotification({
					type: 'error',
					message: 'Failed to access webcam',
				});
			}
		}
	};

	// Start video stream
	const startVideoStream = async () => {
		if (cameraFeedRef.current) {
			try {
				let stream: MediaStream;

				if (selectedVideoInputDeviceId === 'screen') {
					// Screen sharing
					stream = await navigator.mediaDevices.getDisplayMedia({
						video: { cursor: 'always' },
						audio: false,
					});
				} else {
					// Camera
					stream = await navigator.mediaDevices.getUserMedia({
						video: selectedVideoInputDeviceId
							? { deviceId: { exact: selectedVideoInputDeviceId } }
							: true,
					});
				}

				if (stream) {
					await getVideoInputDevices();
					setCameraStream(stream);
					cameraFeedRef.current.srcObject = stream;
					await cameraFeedRef.current.play();
				}
			} catch (error) {
				console.error('Error starting video stream:', error);
				notificationStore.addNotification({
					type: 'error',
					message: 'Failed to start video stream',
				});
			}
		}
	};

	// Stop video stream
	const stopVideoStream = async () => {
		if (cameraStream) {
			const tracks = cameraStream.getTracks();
			tracks.forEach((track) => track.stop());
			setCameraStream(null);
		}
	};

	// Take screenshot
	const takeScreenshot = (): string | null => {
		if (!cameraFeedRef.current || !cameraCanvasRef.current) return null;

		const video = cameraFeedRef.current;
		const canvas = cameraCanvasRef.current;
		const context = canvas.getContext('2d');

		if (!context) return null;

		// Make the canvas match the video dimensions
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		// Draw the image from the video onto the canvas
		context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

		// Convert the canvas to a data URL
		return canvas.toDataURL('image/png');
	};

	// Stop camera
	const stopCamera = async () => {
		await stopVideoStream();
		setCamera(false);
	};

	// Constants
	const MIN_DECIBELS = -55;
	const VISUALIZER_BUFFER_LENGTH = 300;

	// Transcribe handler
	const transcribeHandler = async (audioBlob: Blob) => {
		// In a real implementation, you would send the audio to a transcription service
		console.log('Transcribing audio...');
		// For now, we'll simulate transcription
		const simulatedText =
			'This is a simulated transcription of the spoken audio.';

		if (simulatedText !== '') {
			try {
				const _responses = await submitPrompt(simulatedText, { _raw: true });
				console.log(_responses);
			} catch (error) {
				console.error('Error submitting prompt:', error);
				notificationStore.addNotification({
					type: 'error',
					message: 'Failed to submit transcribed text',
				});
			}
		}
	};

	// Stop recording callback
	const stopRecordingCallback = async (_continue = true) => {
		console.log(
			'%c%s',
			'color: red; font-size: 20px;',
			'🚨 stopRecordingCallback 🚨',
		);

		// Deep copy the audio chunks
		const _audioChunks = [...audioChunks];
		setAudioChunks([]);
		setMediaRecorder(null);

		if (_continue) {
			startRecording();
		}

		if (confirmed) {
			setLoading(true);
			setEmoji(null);

			if (cameraStream) {
				const imageUrl = takeScreenshot();
				if (imageUrl) {
					// In a real implementation, you would update the files state
					console.log('Screenshot taken:', imageUrl);
				}
			}

			const audioBlob = new Blob(_audioChunks, { type: 'audio/wav' });
			await transcribeHandler(audioBlob);

			setConfirmed(false);
			setLoading(false);
		}
	};

	// Start recording
	const startRecording = async () => {
		try {
			if (!audioStream) {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: {
						echoCancellation: true,
						noiseSuppression: true,
						autoGainControl: true,
					},
				});
				setAudioStream(stream);
			}

			if (audioStream) {
				const recorder = new MediaRecorder(audioStream);
				setMediaRecorder(recorder);

				recorder.onstart = () => {
					console.log('Recording started');
					setAudioChunks([]);
				};

				recorder.ondataavailable = (event) => {
					if (hasStartedSpeaking) {
						setAudioChunks((prev) => [...prev, event.data]);
					}
				};

				recorder.onstop = () => {
					console.log('Recording stopped');
					stopRecordingCallback();
				};

				// Start analyzing audio
				analyseAudio(audioStream);
			}
		} catch (error) {
			console.error('Error starting recording:', error);
			notificationStore.addNotification({
				type: 'error',
				message: 'Failed to start recording',
			});
		}
	};

	// Stop audio stream
	const stopAudioStream = async () => {
		try {
			if (mediaRecorder) {
				mediaRecorder.stop();
			}
		} catch (error) {
			console.log('Error stopping audio stream:', error);
		}

		if (audioStream) {
			const tracks = audioStream.getAudioTracks();
			tracks.forEach((track) => track.stop());
			setAudioStream(null);
		}
	};

	// Calculate RMS level from time domain data
	const calculateRMS = (data: Uint8Array) => {
		let sumSquares = 0;
		for (let i = 0; i < data.length; i++) {
			const normalizedValue = (data[i] - 128) / 128; // Normalize the data
			sumSquares += normalizedValue * normalizedValue;
		}
		return Math.sqrt(sumSquares / data.length);
	};

	// Analyse audio
	const analyseAudio = (stream: MediaStream) => {
		const audioContext = new AudioContext();
		const audioStreamSource = audioContext.createMediaStreamSource(stream);

		const analyser = audioContext.createAnalyser();
		analyser.minDecibels = MIN_DECIBELS;
		audioStreamSource.connect(analyser);

		const bufferLength = analyser.frequencyBinCount;
		const domainData = new Uint8Array(bufferLength);
		const timeDomainData = new Uint8Array(analyser.fftSize);

		let lastSoundTime = Date.now();
		let localHasStartedSpeaking = false;

		console.log(
			'🔊 Sound detection started',
			lastSoundTime,
			localHasStartedSpeaking,
		);

		const detectSound = () => {
			const processFrame = () => {
				if (!mediaRecorder) {
					return;
				}

				if (assistantSpeaking) {
					// Mute the audio if the assistant is speaking
					analyser.maxDecibels = 0;
					analyser.minDecibels = -1;
				} else {
					analyser.minDecibels = MIN_DECIBELS;
					analyser.maxDecibels = -30;
				}

				analyser.getByteTimeDomainData(timeDomainData);
				analyser.getByteFrequencyData(domainData);

				// Calculate RMS level from time domain data
				const currentRmsLevel = calculateRMS(timeDomainData);
				setRmsLevel(currentRmsLevel);

				// Check if initial speech/noise has started
				const hasSound = domainData.some((value) => value > 0);
				if (hasSound) {
					// BIG RED TEXT
					console.log(
						'%c%s',
						'color: red; font-size: 20px;',
						'🔊 Sound detected',
					);
					if (mediaRecorder && mediaRecorder.state !== 'recording') {
						mediaRecorder.start();
					}

					if (!localHasStartedSpeaking) {
						localHasStartedSpeaking = true;
						setHasStartedSpeaking(true);
						stopAllAudio();
					}

					lastSoundTime = Date.now();
				}

				// Start silence detection only after initial speech/noise has been detected
				if (localHasStartedSpeaking) {
					if (Date.now() - lastSoundTime > 2000) {
						setConfirmed(true);

						if (mediaRecorder) {
							console.log(
								'%c%s',
								'color: red; font-size: 20px;',
								'🔇 Silence detected',
							);
							mediaRecorder.stop();
							return;
						}
					}
				}

				requestAnimationFrame(processFrame);
			};

			requestAnimationFrame(processFrame);
		};

		detectSound();
	};

	// Finished messages tracking
	const finishedMessages = useRef<Record<string, boolean>>({});
	const currentMessageId = useRef<string | null>(null);
	const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

	// Speak using speech synthesis
	const speakSpeechSynthesisHandler = (content: string) => {
		return new Promise<void>((resolve) => {
			let voices: SpeechSynthesisVoice[] = [];
			const getVoicesLoop = setInterval(async () => {
				voices = speechSynthesis.getVoices();
				if (voices.length > 0) {
					clearInterval(getVoicesLoop);

					const voice =
						voices.find((v) => v.voiceURI === 'Google US English') || voices[0];

					currentUtterance.current = new SpeechSynthesisUtterance(content);
					currentUtterance.current.rate = 1;

					if (voice) {
						currentUtterance.current.voice = voice;
					}

					speechSynthesis.speak(currentUtterance.current);
					currentUtterance.current.onend = async () => {
						await new Promise((r) => setTimeout(r, 200));
						resolve();
					};
				}
			}, 100);
		});
	};

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
		setInterrupted(true);

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
		const { id, content } = e.detail;
		// "content" here is the entire message from the assistant
		finishedMessages.current[id] = true;

		setChatStreaming(false);
	};

	// Set wake lock
	const setWakeLockHandler = async () => {
		if ('wakeLock' in navigator) {
			try {
				const lock = await navigator.wakeLock.request('screen');
				setWakeLock(lock);
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
			eventTarget.addEventListener(
				'chat:start',
				chatStartHandler as EventListener,
			);
			eventTarget.addEventListener('chat', chatEventHandler as EventListener);
			eventTarget.addEventListener(
				'chat:finish',
				chatFinishHandler as EventListener,
			);
		};

		init();

		// Cleanup function
		return () => {
			stopAllAudio();
			stopAudioStream();

			// Remove event listeners
			eventTarget.removeEventListener(
				'chat:start',
				chatStartHandler as EventListener,
			);
			eventTarget.removeEventListener(
				'chat',
				chatEventHandler as EventListener,
			);
			eventTarget.removeEventListener(
				'chat:finish',
				chatFinishHandler as EventListener,
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
	}, []);

	// Effect for unmounting
	useEffect(() => {
		return () => {
			stopAllAudio();
			stopRecordingCallback(false);
			stopCamera();

			stopAudioStream();
			eventTarget.removeEventListener(
				'chat:start',
				chatStartHandler as EventListener,
			);
			eventTarget.removeEventListener(
				'chat',
				chatEventHandler as EventListener,
			);
			eventTarget.removeEventListener(
				'chat:finish',
				chatFinishHandler as EventListener,
			);

			if (audioAbortController.current) {
				audioAbortController.current.abort();
			}

			stopAllAudio();
		};
	}, []);

	return (
		<div className="max-w-lg w-full h-full max-h-[100dvh] flex flex-col justify-between p-3 md:p-6">
			{camera && (
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
							style={{
								fontSize: `${
									rmsLevel * 100 > 4
										? '4.5'
										: rmsLevel * 100 > 2
											? '4.25'
											: rmsLevel * 100 > 1
												? '3.75'
												: '3.5'
								}rem`,
								width: '100%',
								textAlign: 'center',
							}}
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
						<div
							className={`${
								rmsLevel * 100 > 4
									? 'size-[4.5rem]'
									: rmsLevel * 100 > 2
										? 'size-16'
										: rmsLevel * 100 > 1
											? 'size-14'
											: 'size-12'
							} transition-all rounded-full ${
								(
									model?.info?.meta?.profile_image_url ?? '/static/favicon.png'
								) !== '/static/favicon.png'
									? 'bg-cover bg-center bg-no-repeat'
									: 'bg-black dark:bg-white'
							} bg-black dark:bg-white`}
							style={{
								backgroundImage:
									(model?.info?.meta?.profile_image_url ??
										'/static/favicon.png') !== '/static/favicon.png'
										? `url('${model?.info?.meta?.profile_image_url}')`
										: 'none',
							}}
						/>
					)}
				</button>
			)}

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
							<div
								className={`${
									rmsLevel * 100 > 4
										? 'size-52'
										: rmsLevel * 100 > 2
											? 'size-48'
											: rmsLevel * 100 > 1
												? 'size-44'
												: 'size-40'
								} transition-all rounded-full ${
									(
										model?.info?.meta?.profile_image_url ??
											'/static/favicon.png'
									) !== '/static/favicon.png'
										? 'bg-cover bg-center bg-no-repeat'
										: 'bg-black dark:bg-white'
								}`}
								style={{
									backgroundImage:
										(model?.info?.meta?.profile_image_url ??
											'/static/favicon.png') !== '/static/favicon.png'
											? `url('${model?.info?.meta?.profile_image_url}')`
											: 'none',
								}}
							/>
						)}
					</button>
				) : (
					<div className="relative flex video-container w-full max-h-full pt-2 pb-4 md:py-6 px-2 h-full">
						<video
							ref={cameraFeedRef}
							autoPlay
							className="rounded-2xl h-full min-w-full object-cover object-center"
							playsInline
						/>

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
							<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
						</svg>
					</button>
				</div>
			</div>

			{/* Hidden audio element */}
			<audio
				id="audioElement"
				ref={audioElementRef}
				style={{ display: 'none' }}
			/>
		</div>
	);
};

export default CallOverlay;
