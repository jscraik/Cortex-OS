import type React from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';

interface LoginPageProps {
	onLogin: (email: string, password: string) => void;
	loading: boolean;
	error: string | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, loading, error }) => {
	const navigate = useNavigate();

	const handleSwitchToRegister = () => {
		navigate('/register');
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Sign in to Cortex WebUI
					</h2>
				</div>
				<LoginForm onLogin={onLogin} loading={loading} error={error} />
				<div className="text-center">
					<p className="text-sm text-gray-600">
						Don't have an account?{' '}
						<button
							type="button"
							onClick={handleSwitchToRegister}
							className="font-medium text-blue-600 hover:text-blue-500"
						>
							Register here
						</button>
					</p>
				</div>
			</div>
		</div>
	);
};

export default LoginPage;
