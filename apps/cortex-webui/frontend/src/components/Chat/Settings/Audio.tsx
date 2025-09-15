'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settingsStore';

interface AudioSettingsProps {
	saveSettings: (settings: any) => void;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({ saveSettings }) => {
	const settings = useSettingsStore();
	const [loaded, setLoaded] = useState(false);

	// Audio settings state
	const [ttsEnabled, setTtsEnabled] = useState(false);
	const [ttsEngine, setTtsEngine] = useState('browser');
	const [ttsVoice, setTtsVoice] = useState('');
	const [ttsSpeed, setTtsSpeed] = useState(1.0);
	const [sttEnabled, setSttEnabled] = useState(false);
	const [sttEngine, setSttEngine] = useState('browser');
	const [audioVolume, setAudioVolume] = useState(80);
	const [audioDevice, setAudioDevice] = useState('');
	const [inputDevice, setInputDevice] = useState('');

	const [availableVoices, setAvailableVoices] = useState<
		SpeechSynthesisVoice[]
	>([]);
	const [availableAudioDevices, setAvailableAudioDevices] = useState<
		MediaDeviceInfo[]
	>([]);
	const [availableInputDevices, setAvailableInputDevices] = useState<
		MediaDeviceInfo[]
	>([]);

	const voicesLoaded = useRef(false);

	useEffect(() => {
		if (settings) {
			setTtsEnabled(settings?.audio?.ttsEnabled ?? false);
			setTtsEngine(settings?.audio?.ttsEngine ?? 'browser');
			setTtsVoice(settings?.audio?.ttsVoice ?? '');
			setTtsSpeed(settings?.audio?.ttsSpeed ?? 1.0);
			setSttEnabled(settings?.audio?.sttEnabled ?? false);
			setSttEngine(settings?.audio?.sttEngine ?? 'browser');
			setAudioVolume(settings?.audio?.volume ?? 80);
			setAudioDevice(settings?.audio?.audioDevice ?? '');
			setInputDevice(settings?.audio?.inputDevice ?? '');
			setLoaded(true);
		}
	}, [settings]);

	// Load available voices and devices
	useEffect(() => {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			const loadVoices = () => {
				const voices = window.speechSynthesis.getVoices();
				if (voices.length > 0 && !voicesLoaded.current) {
					setAvailableVoices(voices);
					voicesLoaded.current = true;
				}
			};

			loadVoices();
			window.speechSynthesis.onvoiceschanged = loadVoices;

			return () => {
				window.speechSynthesis.onvoiceschanged = null;
			};
		}
	}, []);

	// Load available media devices
	useEffect(() => {
		if (typeof navigator !== 'undefined' && 'mediaDevices' in navigator) {
			navigator.mediaDevices
				.enumerateDevices()
				.then((devices) => {
					const audioOutputDevices = devices.filter(
						(device) => device.kind === 'audiooutput',
					);
					const audioInputDevices = devices.filter(
						(device) => device.kind === 'audioinput',
					);

					setAvailableAudioDevices(audioOutputDevices);
					setAvailableInputDevices(audioInputDevices);
				})
				.catch((err) => {
					console.error('Error enumerating devices:', err);
					toast.error('Failed to load audio devices');
				});
		}
	}, []);

	const handleSubmit = () => {
		saveSettings({
			audio: {
				ttsEnabled,
				ttsEngine,
				ttsVoice,
				ttsSpeed,
				sttEnabled,
				sttEngine,
				volume: audioVolume,
				audioDevice,
				inputDevice,
			},
		});
	};

	const testTts = () => {
		if ('speechSynthesis' in window) {
			const utterance = new SpeechSynthesisUtterance(
				'This is a test of the text to speech functionality.',
			);
			utterance.rate = ttsSpeed;

			if (ttsVoice) {
				const voice = availableVoices.find((v) => v.voiceURI === ttsVoice);
				if (voice) {
					utterance.voice = voice;
				}
			}

			window.speechSynthesis.speak(utterance);
		} else {
			toast.error('Text-to-speech is not supported in your browser');
		}
	};

	if (!loaded) {
		return <div>Loading...</div>;
	}

	return (
		<div
			id="tab-audio"
			className="flex flex-col h-full justify-between text-sm"
		>
			<div className="overflow-y-scroll max-h-[28rem] lg:max-h-full space-y-6">
				<div>
					<div className="text-base font-medium mb-3">Text-to-Speech (TTS)</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Enable TTS</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable text-to-speech for AI responses
								</div>
							</div>
							<button
								type="button"
								onClick={() => setTtsEnabled(!ttsEnabled)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									ttsEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										ttsEnabled ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						{ttsEnabled && (
							<>
								<div>
									<label
										htmlFor="tts-engine"
										className="block text-sm font-medium mb-1"
									>
										TTS Engine
									</label>
									<select
										id="tts-engine"
										value={ttsEngine}
										onChange={(e) => setTtsEngine(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
									>
										<option value="browser">Browser Built-in</option>
										<option value="elevenlabs">ElevenLabs</option>
										<option value="openai">OpenAI</option>
									</select>
								</div>

								<div>
									<label
										htmlFor="tts-voice"
										className="block text-sm font-medium mb-1"
									>
										Voice
									</label>
									<select
										id="tts-voice"
										value={ttsVoice}
										onChange={(e) => setTtsVoice(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
									>
										<option value="">Default</option>
										{availableVoices.map((voice) => (
											<option key={voice.voiceURI} value={voice.voiceURI}>
												{voice.name} ({voice.lang})
											</option>
										))}
									</select>
								</div>

								<div>
									<label
										htmlFor="tts-speed"
										className="block text-sm font-medium mb-1"
									>
										Speed: {ttsSpeed.toFixed(1)}
									</label>
									<input
										id="tts-speed"
										type="range"
										min="0.5"
										max="2.0"
										step="0.1"
										value={ttsSpeed}
										onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
										className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
									/>
									<div className="flex justify-between text-xs text-gray-500 mt-1">
										<span>0.5x</span>
										<span>1.0x</span>
										<span>2.0x</span>
									</div>
								</div>

								<div>
									<button
										type="button"
										onClick={testTts}
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
									>
										Test TTS
									</button>
								</div>
							</>
						)}
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-3">Speech-to-Text (STT)</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="font-medium">Enable STT</div>
								<div className="text-xs text-gray-500 mt-0.5">
									Enable speech-to-text for voice input
								</div>
							</div>
							<button
								type="button"
								onClick={() => setSttEnabled(!sttEnabled)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
									sttEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										sttEnabled ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						{sttEnabled && (
							<div>
								<label
									htmlFor="stt-engine"
									className="block text-sm font-medium mb-1"
								>
									STT Engine
								</label>
								<select
									id="stt-engine"
									value={sttEngine}
									onChange={(e) => setSttEngine(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
								>
									<option value="browser">Browser Built-in</option>
									<option value="deepgram">Deepgram</option>
									<option value="openai">OpenAI</option>
								</select>
							</div>
						)}
					</div>
				</div>

				<div>
					<div className="text-base font-medium mb-3">Audio Devices</div>

					<div className="space-y-4">
						<div>
							<label
								htmlFor="audio-output"
								className="block text-sm font-medium mb-1"
							>
								Audio Output Device
							</label>
							<select
								id="audio-output"
								value={audioDevice}
								onChange={(e) => setAudioDevice(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							>
								<option value="">System Default</option>
								{availableAudioDevices.map((device) => (
									<option key={device.deviceId} value={device.deviceId}>
										{device.label ||
											`Audio Output ${device.deviceId.substring(0, 8)}`}
									</option>
								))}
							</select>
						</div>

						<div>
							<label
								htmlFor="audio-input"
								className="block text-sm font-medium mb-1"
							>
								Audio Input Device
							</label>
							<select
								id="audio-input"
								value={inputDevice}
								onChange={(e) => setInputDevice(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							>
								<option value="">System Default</option>
								{availableInputDevices.map((device) => (
									<option key={device.deviceId} value={device.deviceId}>
										{device.label ||
											`Audio Input ${device.deviceId.substring(0, 8)}`}
									</option>
								))}
							</select>
						</div>

						<div>
							<label
								htmlFor="audio-volume"
								className="block text-sm font-medium mb-1"
							>
								Volume: {audioVolume}%
							</label>
							<input
								id="audio-volume"
								type="range"
								min="0"
								max="100"
								value={audioVolume}
								onChange={(e) => setAudioVolume(parseInt(e.target.value, 10))}
								className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
							/>
							<div className="flex justify-between text-xs text-gray-500 mt-1">
								<span>0%</span>
								<span>50%</span>
								<span>100%</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4 flex justify-end">
				<button
					type="button"
					onClick={handleSubmit}
					className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Save Changes
				</button>
			</div>
		</div>
	);
};

export default AudioSettings;
