import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './pages/Dashboard';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
	throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(
	<StrictMode>
		<Dashboard />
	</StrictMode>,
);
