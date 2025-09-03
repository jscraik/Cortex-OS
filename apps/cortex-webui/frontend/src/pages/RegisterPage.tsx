import type React from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterForm from '../components/Auth/RegisterForm';

interface RegisterPageProps {
	onRegister: (name: string, email: string, password: string) => void;
	loading: boolean;
	error: string | null;
}

const RegisterPage: React.FC<RegisterPageProps> = ({
	onRegister,
	loading,
	error,
}) => {
	const navigate = useNavigate();

	const handleSwitchToLogin = () => {
		navigate('/login');
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Create an account
					</h2>
				</div>
				<RegisterForm onRegister={onRegister} loading={loading} error={error} />
				<div className="text-center">
					<p className="text-sm text-gray-600">
						Already have an account?{' '}
						<button
							onClick={handleSwitchToLogin}
							className="font-medium text-blue-600 hover:text-blue-500"
							type="button"
						>
							Sign in
						</button>
					</p>
				</div>
			</div>
		</div>
	);
};

export default RegisterPage;
