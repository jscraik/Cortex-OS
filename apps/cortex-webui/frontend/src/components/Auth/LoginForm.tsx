import type React from 'react';
import { useId, useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

interface LoginFormProps {
	onLogin?: (email: string, password: string) => void;
	loading?: boolean;
	error?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, loading, error }) => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const emailId = useId();
	const passwordId = useId();
	const { login: authLogin, loginWithOAuth, oauthProviders, isPending } = useAuthContext();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (onLogin) {
				onLogin(email, password);
			} else {
				await authLogin(email, password);
			}
		} catch (error) {
			// Error is handled by the context
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label htmlFor={emailId} className="block text-sm font-medium text-gray-700">
					Email
				</label>
				<input
					id={emailId}
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
					required
				/>
			</div>
			<div>
				<label htmlFor={passwordId} className="block text-sm font-medium text-gray-700">
					Password
				</label>
				<input
					id={passwordId}
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
					required
				/>
			</div>
			{error && (
				<div className="text-red-500 text-sm" role="alert">
					{error}
				</div>
			)}
			<button
				type="submit"
				disabled={loading || isPending}
				className="w-full bg-blue-500 text-white rounded px-4 py-2 disabled:opacity-50"
			>
				{loading || isPending ? 'Logging in...' : 'Log In'}
			</button>

			{/* OAuth Login Options */}
			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<div className="w-full border-t border-gray-300" />
				</div>
				<div className="relative flex justify-center text-sm">
					<span className="px-2 bg-white text-gray-500">Or continue with</span>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				{oauthProviders.map((provider) => (
					<button
						key={provider.id}
						type="button"
						onClick={() => loginWithOAuth(provider.id)}
						disabled={loading || isPending}
						className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
						style={{ borderColor: provider.color }}
					>
						<span className="sr-only">{provider.name}</span>
						<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
							{/* Provider icon - you can replace with actual SVG icons */}
							<text x="12" y="16" textAnchor="middle" fontSize="12" fill={provider.color}>
								{provider.icon[0].toUpperCase()}
							</text>
						</svg>
					</button>
				))}
			</div>

			{/* Forgot Password Link */}
			<div className="text-sm text-center">
				<a
					href="/forgot-password"
					className="font-medium text-blue-600 hover:text-blue-500"
				>
					Forgot your password?
				</a>
			</div>
		</form>
	);
};

export default LoginForm;
