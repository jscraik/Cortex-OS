// Main App component

import { useEffect, useState } from 'react';
import {
	Navigate,
	Route,
	BrowserRouter as Router,
	Routes,
	useNavigate,
} from 'react-router-dom';
import useAuth from './hooks/useAuth';
import useConversations from './hooks/useConversations';
import useMessages from './hooks/useMessages';
import ChatPage from './pages/ChatPage';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import type { Theme } from './utils/theme';
import { applyTheme, toggleTheme } from './utils/theme';

const AppContent: React.FC = () => {
	const navigate = useNavigate();
	const [theme, setTheme] = useState<Theme>('light');
	const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

	const auth = useAuth();
	const conversations = useConversations();
	const messages = useMessages();

	// Apply theme on mount
	useEffect(() => {
		applyTheme();
		setTheme(
			document.documentElement.classList.contains('dark') ? 'dark' : 'light',
		);
	}, []);

	const handleLogin = async (email: string, password: string) => {
		try {
			await auth.login(email, password);
		} catch (error) {
			console.error('Login failed:', error);
		}
	};

	const handleRegister = async (
		name: string,
		email: string,
		password: string,
	) => {
		try {
			await auth.register(name, email, password);
		} catch (error) {
			console.error('Registration failed:', error);
		}
	};

	const handleSendMessage = async (content: string) => {
		if (conversations.activeConversation) {
			await messages.sendMessage(conversations.activeConversation.id, content);
		}
	};

	const handleCreateConversation = async () => {
		const newConversation =
			await conversations.createConversation('New Conversation');
		if (newConversation) {
			navigate(`/chat/${newConversation.id}`);
		}
	};

	const handleSelectConversation = async (id: string) => {
		await conversations.selectConversation(id);
		navigate(`/chat/${id}`);
	};

	const handleThemeChange = (newTheme: Theme) => {
		setTheme(newTheme);
		toggleTheme();
	};

	return (
		<div className="App">
			<Routes>
				<Route
					path="/login"
					element={
						<LoginPage
							onLogin={handleLogin}
							loading={auth.loading}
							error={auth.error}
						/>
					}
				/>
				<Route
					path="/register"
					element={
						<RegisterPage
							onRegister={handleRegister}
							loading={auth.loading}
							error={auth.error}
						/>
					}
				/>
				<Route
					path="/dashboard"
					element={
						auth.isAuthenticated ? (
							<Dashboard
								conversations={conversations.conversations}
								activeConversationId={
									conversations.activeConversation?.id || null
								}
								onSelectConversation={handleSelectConversation}
								onCreateConversation={handleCreateConversation}
								onLogout={auth.logout}
								onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
							/>
						) : (
							<Navigate to="/login" />
						)
					}
				/>
				<Route
					path="/chat/:conversationId"
					element={
						auth.isAuthenticated && conversations.activeConversation ? (
							<ChatPage
								conversation={conversations.activeConversation}
								messages={messages.messages}
								conversations={conversations.conversations}
								activeConversationId={
									conversations.activeConversation?.id || null
								}
								onSendMessage={handleSendMessage}
								onSelectConversation={handleSelectConversation}
								onCreateConversation={handleCreateConversation}
								onLogout={auth.logout}
								onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
								streaming={messages.streaming}
								error={messages.error}
							/>
						) : (
							<Navigate to="/dashboard" />
						)
					}
				/>
				<Route
					path="/settings"
					element={
						auth.isAuthenticated ? (
							<SettingsPage
								theme={theme}
								onThemeChange={handleThemeChange}
								onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
							/>
						) : (
							<Navigate to="/login" />
						)
					}
				/>
				<Route
					path="/"
					element={
						<Navigate to={auth.isAuthenticated ? '/dashboard' : '/login'} />
					}
				/>
			</Routes>
		</div>
	);
};

export const App: React.FC = () => {
	return (
		<Router>
			<AppContent />
		</Router>
	);
};
