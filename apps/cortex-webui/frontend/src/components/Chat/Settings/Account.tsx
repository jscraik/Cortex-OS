'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createAPIKey, getAPIKey, updateUserProfile } from '@/lib/api/auth';
import { copyToClipboard, generateInitialsImage } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUserStore } from '@/stores/userStore';

interface AccountSettingsProps {
	saveHandler: () => void;
	saveSettings: (settings: any) => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
	saveHandler,
	saveSettings,
}) => {
	const [loaded, setLoaded] = useState(false);
	const [profileImageUrl, setProfileImageUrl] = useState('');
	const [name, setName] = useState('');
	const [bio, setBio] = useState('');
	const [gender, setGender] = useState('');
	const [dateOfBirth, setDateOfBirth] = useState('');
	const [webhookUrl, setWebhookUrl] = useState('');
	const [showAPIKeys, setShowAPIKeys] = useState(false);
	const [JWTTokenCopied, setJWTTokenCopied] = useState(false);
	const [APIKey, setAPIKey] = useState('');
	const [APIKeyCopied, setAPIKeyCopied] = useState(false);

	const user = useUserStore();
	const settings = useSettingsStore();
	const profileImageInputElement = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const initialize = async () => {
			if (user) {
				setName(user.name ?? '');
				setProfileImageUrl(user.profile_image_url ?? '');
				setBio(user.bio ?? '');
				setGender(user.gender ?? '');
				setDateOfBirth(user.date_of_birth ?? '');
			}

			setWebhookUrl(settings?.notifications?.webhook_url ?? '');

			try {
				const key = await getAPIKey();
				setAPIKey(key || '');
			} catch (error) {
				console.log(error);
			}

			setLoaded(true);
		};

		initialize();
	}, [user, settings]);

	const submitHandler = async () => {
		if (name !== user?.name) {
			if (
				profileImageUrl === generateInitialsImage(user?.name) ||
				profileImageUrl === ''
			) {
				setProfileImageUrl(generateInitialsImage(name));
			}
		}

		if (webhookUrl !== settings?.notifications?.webhook_url) {
			saveSettings({
				notifications: {
					...settings.notifications,
					webhook_url: webhookUrl,
				},
			});
		}

		try {
			const updatedUser = await updateUserProfile({
				name: name,
				profile_image_url: profileImageUrl,
				bio: bio ? bio : null,
				gender: gender ? gender : null,
				date_of_birth: dateOfBirth ? dateOfBirth : null,
			});

			if (updatedUser) {
				// Update user store with new data
				// This would typically be handled by the store itself
				toast.success('Profile updated successfully');
				return true;
			}
		} catch (error) {
			toast.error('Failed to update profile');
		}
		return false;
	};

	const createAPIKeyHandler = async () => {
		try {
			const newAPIKey = await createAPIKey();
			if (newAPIKey) {
				setAPIKey(newAPIKey);
				toast.success('API Key created.');
			} else {
				toast.error('Failed to create API Key.');
			}
		} catch (error) {
			toast.error('Failed to create API Key.');
		}
	};

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		if (
			!['image/gif', 'image/webp', 'image/jpeg', 'image/png'].includes(
				file.type,
			)
		) {
			toast.error('Invalid file type. Please select an image.');
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			const originalImageUrl = event.target?.result as string;

			const img = new Image();
			img.src = originalImageUrl;

			img.onload = () => {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				if (!ctx) return;

				// Calculate the aspect ratio of the image
				const aspectRatio = img.width / img.height;

				// Calculate the new width and height to fit within 250x250
				let newWidth, newHeight;
				if (aspectRatio > 1) {
					newWidth = 250 * aspectRatio;
					newHeight = 250;
				} else {
					newWidth = 250;
					newHeight = 250 / aspectRatio;
				}

				// Set the canvas size
				canvas.width = 250;
				canvas.height = 250;

				// Calculate the position to center the image
				const offsetX = (250 - newWidth) / 2;
				const offsetY = (250 - newHeight) / 2;

				// Draw the image on the canvas
				ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight);

				// Get the base64 representation of the compressed image
				const compressedSrc = canvas.toDataURL('image/jpeg');

				// Display the compressed image
				setProfileImageUrl(compressedSrc);

				if (profileImageInputElement.current) {
					profileImageInputElement.current.files = null;
				}
			};
		};

		reader.readAsDataURL(file);
	};

	if (!loaded) {
		return <div>Loading...</div>;
	}

	return (
		<div
			id="tab-account"
			className="flex flex-col h-full justify-between text-sm"
		>
			<div className="overflow-y-scroll max-h-[28rem] lg:max-h-full">
				<input
					id="profile-image-input"
					ref={profileImageInputElement}
					type="file"
					hidden
					accept="image/*"
					onChange={handleImageChange}
				/>

				<div className="space-y-1">
					<div>
						<div className="text-base font-medium">Your Account</div>
						<div className="text-xs text-gray-500 mt-0.5">
							Manage your account information.
						</div>
					</div>

					<div className="flex space-x-5 my-4">
						<div className="flex flex-col self-start group">
							<div className="self-center flex">
								<button
									className="relative rounded-full dark:bg-gray-700"
									type="button"
									onClick={() => {
										if (profileImageInputElement.current) {
											profileImageInputElement.current.click();
										}
									}}
								>
									{profileImageUrl ? (
										<img
											src={profileImageUrl}
											alt="Profile"
											className="rounded-full w-16 h-16 object-cover"
										/>
									) : (
										<div className="rounded-full w-16 h-16 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
											<span className="text-2xl font-bold text-gray-500">
												{name.charAt(0).toUpperCase()}
											</span>
										</div>
									)}
									<div className="absolute bottom-0 end-0 rounded-full bg-white dark:bg-gray-900 p-1 group-hover:opacity-100 opacity-0">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											className="size-4"
										>
											<path d="M10 3a3 3 0 0 0-3 3v7.5a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3ZM8.5 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
											<path d="M4 10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.586A3 3 0 0 1 11.586 3H8.414A3 3 0 0 0 6.586 4H5a2 2 0 0 0-2 2v4Z" />
										</svg>
									</div>
								</button>
							</div>
						</div>

						<div className="flex-1">
							<div className="mb-2">
								<label
									htmlFor="name"
									className="block text-sm font-medium mb-1"
								>
									Name
								</label>
								<input
									id="name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
								/>
							</div>

							<div>
								<label htmlFor="bio" className="block text-sm font-medium mb-1">
									Bio
								</label>
								<textarea
									id="bio"
									value={bio}
									onChange={(e) => setBio(e.target.value)}
									rows={3}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
								/>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="gender"
								className="block text-sm font-medium mb-1"
							>
								Gender
							</label>
							<select
								id="gender"
								value={gender}
								onChange={(e) => setGender(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							>
								<option value="">Prefer not to say</option>
								<option value="male">Male</option>
								<option value="female">Female</option>
								<option value="other">Other</option>
							</select>
						</div>

						<div>
							<label
								htmlFor="date-of-birth"
								className="block text-sm font-medium mb-1"
							>
								Date of Birth
							</label>
							<input
								id="date-of-birth"
								type="date"
								value={dateOfBirth}
								onChange={(e) => setDateOfBirth(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							/>
						</div>
					</div>

					<div className="pt-4">
						<div className="text-base font-medium mb-2">Notifications</div>
						<div>
							<label
								htmlFor="webhook-url"
								className="block text-sm font-medium mb-1"
							>
								Webhook URL
							</label>
							<input
								id="webhook-url"
								type="url"
								value={webhookUrl}
								onChange={(e) => setWebhookUrl(e.target.value)}
								placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							/>
						</div>
					</div>

					<div className="pt-4">
						<div className="text-base font-medium mb-2">API Keys</div>
						<div className="flex items-center space-x-2">
							<input
								type="text"
								value={APIKey || ''}
								readOnly
								placeholder="API Key"
								className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							/>
							<button
								type="button"
								onClick={createAPIKeyHandler}
								className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							>
								Create
							</button>
							<button
								type="button"
								onClick={async () => {
									if (APIKey) {
										const result = await copyToClipboard(APIKey);
										if (result) {
											setAPIKeyCopied(true);
											setTimeout(() => setAPIKeyCopied(false), 2000);
											toast.success('API Key copied to clipboard');
										} else {
											toast.error('Failed to copy API Key');
										}
									}
								}}
								className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
							>
								{APIKeyCopied ? 'Copied!' : 'Copy'}
							</button>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4 flex justify-end">
				<button
					type="button"
					onClick={submitHandler}
					className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Save Changes
				</button>
			</div>
		</div>
	);
};

export default AccountSettings;
