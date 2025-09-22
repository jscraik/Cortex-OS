import type React from 'react';
import { useId, useState } from 'react';

interface RegisterFormProps {
	onRegister: (name: string, email: string, password: string) => void;
	loading: boolean;
	error: string | null;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegister, loading, error }) => {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const nameId = useId();
	const emailId = useId();
	const passwordId = useId();
	const confirmPasswordId = useId();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirmPassword) {
			alert('Passwords do not match');
			return;
		}
		onRegister(name, email, password);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label htmlFor={nameId} className="block text-sm font-medium text-gray-700">
					Name
				</label>
				<input
					id={nameId}
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
					required
				/>
			</div>
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
			<div>
				<label htmlFor={confirmPasswordId} className="block text-sm font-medium text-gray-700">
					Confirm Password
				</label>
				<input
					id={confirmPasswordId}
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
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
				disabled={loading}
				className="w-full bg-blue-500 text-white rounded px-4 py-2 disabled:opacity-50"
			>
				{loading ? 'Registering...' : 'Register'}
			</button>
		</form>
	);
};

export default RegisterForm;
