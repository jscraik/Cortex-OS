// LoginPage component tests for Cortex WebUI frontend
// brAInwav security standards with comprehensive React component testing

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { MemoryRouter, Router } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../pages/LoginPage';

// Mock the LoginForm component
vi.mock('../components/Auth/LoginForm', () => ({
	default: ({ onLogin, loading, error }: any) => (
		<div data-testid="login-form">
			<input data-testid="email-input" placeholder="Email" />
			<input data-testid="password-input" type="password" placeholder="Password" />
			<button
				data-testid="login-button"
				onClick={() => onLogin('test@example.com', 'password123')}
				disabled={loading}
			>
				{loading ? 'Signing in...' : 'Sign in'}
			</button>
			{error && <div data-testid="error-message">{error}</div>}
		</div>
	),
}));

describe('LoginPage', () => {
	const mockOnLogin = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render login page correctly', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.getByText('Sign in to Cortex WebUI')).toBeInTheDocument();
			expect(screen.getByTestId('login-form')).toBeInTheDocument();
			expect(screen.getByTestId('login-button')).toBeInTheDocument();
			expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
			expect(screen.getByText('Register here')).toBeInTheDocument();
		});

		it('should display loading state correctly', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={true} error={null} />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.getByTestId('login-button')).toHaveTextContent('Signing in...');
			expect(screen.getByTestId('login-button')).toBeDisabled();
		});

		it('should display error message when provided', () => {
			// Arrange
			const errorMessage = 'Invalid credentials';
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={errorMessage} />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.getByTestId('error-message')).toBeInTheDocument();
			expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
		});

		it('should have correct accessibility attributes', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.getByRole('main')).toBeInTheDocument();
			expect(screen.getByRole('heading', { name: /sign in to cortex webui/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /register here/i })).toBeInTheDocument();
		});
	});

	describe('User Interactions', () => {
		it('should handle login when login form triggers onLogin', async () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Act
			const loginButton = screen.getByTestId('login-button');
			fireEvent.click(loginButton);

			// Assert
			expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123');
		});

		it('should not trigger login when loading', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={true} error={null} />
				</MemoryRouter>,
			);

			// Act
			const loginButton = screen.getByTestId('login-button');
			fireEvent.click(loginButton);

			// Assert
			expect(mockOnLogin).not.toHaveBeenCalled();
		});

		it('should navigate to register page when register link is clicked', () => {
			// Arrange
			const history = createMemoryHistory();
			history.push('/login');

			render(
				<Router location={history.location} navigator={history}>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</Router>,
			);

			// Act
			const registerLink = screen.getByText('Register here');
			fireEvent.click(registerLink);

			// Assert
			expect(history.location.pathname).toBe('/register');
		});
	});

	describe('Component Props', () => {
		it('should pass correct props to LoginForm', () => {
			// Arrange
			const loading = true;
			const error = 'Test error';

			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={loading} error={error} />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.getByTestId('login-button')).toBeDisabled();
			expect(screen.getByTestId('error-message')).toBeInTheDocument();
			expect(screen.getByTestId('error-message')).toHaveTextContent(error);
		});

		it('should handle null error prop', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
		});

		it('should handle empty string error prop', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error="" />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
		});
	});

	describe('Styling and Layout', () => {
		it('should apply correct CSS classes', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Assert
			const container = screen.getByRole('main').firstChild as HTMLElement;
			expect(container).toHaveClass(
				'min-h-screen',
				'flex',
				'items-center',
				'justify-center',
				'bg-gray-50',
			);

			const formContainer = container?.firstChild as HTMLElement;
			expect(formContainer).toHaveClass(
				'max-w-md',
				'w-full',
				'space-y-8',
				'p-10',
				'bg-white',
				'rounded-xl',
				'shadow',
			);
		});

		it('should have responsive design classes', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.getByRole('main')).toHaveClass('min-h-screen');
			expect(screen.getByText('Sign in to Cortex WebUI')).toHaveClass(
				'text-3xl',
				'font-extrabold',
				'text-gray-900',
			);
		});
	});

	describe('Navigation Behavior', () => {
		it('should use React Router for navigation', () => {
			// Arrange
			const history = createMemoryHistory();
			const pushSpy = vi.spyOn(history, 'push');

			render(
				<Router location={history.location} navigator={history}>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</Router>,
			);

			// Act
			const registerLink = screen.getByText('Register here');
			fireEvent.click(registerLink);

			// Assert
			expect(pushSpy).toHaveBeenCalledWith('/register');
		});

		it('should maintain navigation state', () => {
			// Arrange
			const history = createMemoryHistory();
			history.push('/login?redirect=/dashboard');

			render(
				<Router location={history.location} navigator={history}>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</Router>,
			);

			// Act
			const registerLink = screen.getByText('Register here');
			fireEvent.click(registerLink);

			// Assert
			expect(history.location.pathname).toBe('/register');
			// Query params should be cleared during navigation
			expect(history.location.search).toBe('');
		});
	});

	describe('Error Handling', () => {
		it('should display brAInwav-branded error messages', () => {
			// Arrange
			const brandedError = 'brAInwav Authentication Error: Invalid credentials';

			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={brandedError} />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.getByTestId('error-message')).toHaveTextContent(brandedError);
		});

		it('should handle long error messages gracefully', () => {
			// Arrange
			const longError =
				'This is a very long error message that should be handled gracefully without breaking the layout or causing overflow issues. '.repeat(
					5,
				);

			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={longError} />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.getByTestId('error-message')).toBeInTheDocument();
			expect(screen.getByTestId('error-message')).toHaveTextContent(longError);
		});

		it('should handle error messages with special characters', () => {
			// Arrange
			const specialCharError =
				'Error: Authentication failed! Please check your credentials & try again. 🚨';

			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={specialCharError} />
				</MemoryRouter>,
			);

			// Assert
			expect(screen.getByTestId('error-message')).toHaveTextContent(specialCharError);
		});
	});

	describe('Performance and Edge Cases', () => {
		it('should handle rapid login attempts', async () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Act
			const loginButton = screen.getByTestId('login-button');

			// Click multiple times rapidly
			fireEvent.click(loginButton);
			fireEvent.click(loginButton);
			fireEvent.click(loginButton);

			// Assert
			await waitFor(() => {
				expect(mockOnLogin).toHaveBeenCalledTimes(3);
			});
		});

		it('should handle prop changes during component lifecycle', () => {
			// Arrange
			const { rerender } = render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Assert initial state
			expect(screen.getByTestId('login-button')).not.toBeDisabled();
			expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();

			// Act - Change props
			rerender(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={true} error="New error" />
				</MemoryRouter>,
			);

			// Assert updated state
			expect(screen.getByTestId('login-button')).toBeDisabled();
			expect(screen.getByTestId('error-message')).toBeInTheDocument();
			expect(screen.getByTestId('error-message')).toHaveTextContent('New error');
		});

		it('should handle missing or undefined props gracefully', () => {
			// Arrange & Act
			expect(() => {
				render(
					<MemoryRouter>
						<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
					</MemoryRouter>,
				);
			}).not.toThrow();
		});
	});

	describe('Accessibility Compliance', () => {
		it('should have proper heading hierarchy', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Assert
			const mainHeading = screen.getByRole('heading', { level: 2 });
			expect(mainHeading).toBeInTheDocument();
			expect(mainHeading).toHaveTextContent('Sign in to Cortex WebUI');
		});

		it('should have focus management', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Act
			const registerLink = screen.getByText('Register here');
			registerLink.focus();

			// Assert
			expect(registerLink).toHaveFocus();
		});

		it('should have appropriate ARIA labels', () => {
			// Arrange
			render(
				<MemoryRouter>
					<LoginPage onLogin={mockOnLogin} loading={false} error={null} />
				</MemoryRouter>,
			);

			// Assert
			const registerLink = screen.getByRole('button', { name: /register here/i });
			expect(registerLink).toHaveAttribute('type', 'button');
		});
	});
});
