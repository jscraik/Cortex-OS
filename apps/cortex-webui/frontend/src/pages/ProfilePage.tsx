import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OAuthLinking from '../components/Auth/OAuthLinking';
import ProfileForm from '../components/Auth/ProfileForm';
import { useAuthContext } from '../contexts/AuthContext';

interface ProfilePageProps {
	theme?: 'light' | 'dark';
	onThemeChange?: () => void;
	onToggleSidebar?: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({
	theme = 'light',
	onThemeChange,
	onToggleSidebar,
}) => {
	const _navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
	const { updatePassword, isPending } = useAuthContext();

	const handlePasswordUpdate = async (data: { currentPassword: string; newPassword: string }) => {
		try {
			await updatePassword(data.currentPassword, data.newPassword);
			// Show success message
			alert('Password updated successfully!');
		} catch (error) {
			console.error('Failed to update password:', error);
			alert('Failed to update password. Please try again.');
		}
	};

	return (
		<div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold">Profile & Settings</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Manage your account settings and preferences
					</p>
				</div>

				{/* Tab Navigation */}
				<div className="border-b border-gray-200 dark:border-gray-700 mb-6">
					<nav className="-mb-px flex space-x-8">
						<button
							onClick={() => setActiveTab('profile')}
							className={`py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === 'profile'
									? 'border-blue-500 text-blue-600 dark:text-blue-400'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
							}`}
						>
							Profile
						</button>
						<button
							onClick={() => setActiveTab('security')}
							className={`py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === 'security'
									? 'border-blue-500 text-blue-600 dark:text-blue-400'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
							}`}
						>
							Security
						</button>
					</nav>
				</div>

				{/* Tab Content */}
				{activeTab === 'profile' && (
					<div className="space-y-6">
						<ProfileForm />
					</div>
				)}

				{activeTab === 'security' && (
					<div className="space-y-6">
						<OAuthLinking />

						{/* Password Change Section */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
							<h3 className="text-lg font-medium mb-4">Change Password</h3>
							<PasswordChangeForm onSubmit={handlePasswordUpdate} loading={isPending} />
						</div>

						{/* Two-Factor Authentication */}
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
							<h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
							<TwoFactorAuthSection />
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

// Password Change Form Component
interface PasswordChangeFormProps {
	onSubmit: (data: { currentPassword: string; newPassword: string }) => void;
	loading?: boolean;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ onSubmit, loading }) => {
	const [formData, setFormData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (formData.newPassword !== formData.confirmPassword) {
			alert('New passwords do not match');
			return;
		}
		if (formData.newPassword.length < 8) {
			alert('Password must be at least 8 characters');
			return;
		}
		onSubmit({
			currentPassword: formData.currentPassword,
			newPassword: formData.newPassword,
		});
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4 max-w-md">
			<div>
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Current Password
				</label>
				<input
					type="password"
					value={formData.currentPassword}
					onChange={(e) => setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
					required
					className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
				/>
			</div>
			<div>
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					New Password
				</label>
				<input
					type="password"
					value={formData.newPassword}
					onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
					required
					minLength={8}
					className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
				/>
			</div>
			<div>
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Confirm New Password
				</label>
				<input
					type="password"
					value={formData.confirmPassword}
					onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
					required
					minLength={8}
					className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
				/>
			</div>
			<button
				type="submit"
				disabled={loading}
				className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
			>
				{loading ? 'Updating...' : 'Update Password'}
			</button>
		</form>
	);
};

// Two-Factor Auth Section Component
const TwoFactorAuthSection: React.FC = () => {
	const { user } = useAuthContext();
	const [isEnabled, setIsEnabled] = useState(false);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h4 className="font-medium">Two-Factor Authentication</h4>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Add an extra layer of security to your account
					</p>
				</div>
				<button
					onClick={() => setIsEnabled(!isEnabled)}
					className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
						isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
					}`}
				>
					<span
						className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
							isEnabled ? 'translate-x-5' : 'translate-x-0'
						}`}
					/>
				</button>
			</div>
			{isEnabled ? (
				<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
					<p className="text-green-800 dark:text-green-200 text-sm">
						✓ Two-factor authentication is enabled for your account
					</p>
				</div>
			) : (
				<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
					<p className="text-yellow-800 dark:text-yellow-200 text-sm">
						⚠️ Two-factor authentication is not enabled. We recommend enabling it for better
						security.
					</p>
				</div>
			)}
		</div>
	);
};

export default ProfilePage;
