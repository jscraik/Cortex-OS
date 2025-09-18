// Theme utility functions with enhanced accessibility support

import storage from '../services/storage';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeColors {
	primary: string;
	secondary: string;
	background: string;
	surface: string;
	text: string;
	textSecondary: string;
	border: string;
	accent: string;
	success: string;
	warning: string;
	error: string;
}

export const lightTheme: ThemeColors = {
	primary: '#3b82f6',
	secondary: '#6b7280',
	background: '#ffffff',
	surface: '#f9fafb',
	text: '#111827',
	textSecondary: '#6b7280',
	border: '#e5e7eb',
	accent: '#10b981',
	success: '#059669',
	warning: '#d97706',
	error: '#dc2626',
};

export const darkTheme: ThemeColors = {
	primary: '#60a5fa',
	secondary: '#9ca3af',
	background: '#111827',
	surface: '#1f2937',
	text: '#f9fafb',
	textSecondary: '#d1d5db',
	border: '#374151',
	accent: '#34d399',
	success: '#10b981',
	warning: '#f59e0b',
	error: '#ef4444',
};

export const getStoredTheme = (): Theme => {
	const storedTheme = storage.getItem('theme');
	if (storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system') {
		return storedTheme;
	}
	return 'system';
};

export const getEffectiveTheme = (): 'light' | 'dark' => {
	const storedTheme = getStoredTheme();

	if (storedTheme === 'system') {
		// Check system preference
		if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
			return 'dark';
		}
		return 'light';
	}

	return storedTheme;
};

export const setTheme = (theme: Theme): void => {
	storage.setItem('theme', theme);
	const effectiveTheme = theme === 'system' ? getEffectiveTheme() : theme;

	document.documentElement.classList.remove('light', 'dark');
	document.documentElement.classList.add(effectiveTheme);

	// Set data attributes for better CSS targeting
	document.documentElement.setAttribute('data-theme', effectiveTheme);

	// Apply CSS custom properties for theme colors
	const colors = effectiveTheme === 'dark' ? darkTheme : lightTheme;
	const root = document.documentElement;

	Object.entries(colors).forEach(([key, value]) => {
		root.style.setProperty(`--color-${key}`, value);
	});

	// Announce theme change to screen readers
	announceThemeChange(effectiveTheme);
};

export const toggleTheme = (): Theme => {
	const currentTheme = getStoredTheme();
	let newTheme: Theme;

	switch (currentTheme) {
		case 'light':
			newTheme = 'dark';
			break;
		case 'dark':
			newTheme = 'system';
			break;
		default:
			newTheme = 'light';
			break;
	}

	setTheme(newTheme);
	return newTheme;
};

export const applyTheme = (): void => {
	const theme = getStoredTheme();
	setTheme(theme);

	// Listen for system theme changes
	if (window.matchMedia) {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', () => {
			if (getStoredTheme() === 'system') {
				setTheme('system'); // Re-apply to reflect system change
			}
		});
	}
};

// Accessibility: Announce theme changes to screen readers
const announceThemeChange = (theme: 'light' | 'dark'): void => {
	const announcement = document.createElement('div');
	announcement.setAttribute('aria-live', 'polite');
	announcement.setAttribute('aria-atomic', 'true');
	announcement.className = 'sr-only';
	announcement.textContent = `Theme changed to ${theme} mode`;

	document.body.appendChild(announcement);

	// Remove announcement after screen readers have processed it
	setTimeout(() => {
		document.body.removeChild(announcement);
	}, 1000);
};

// Check for reduced motion preference
export const prefersReducedMotion = (): boolean => {
	return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
};

// High contrast mode detection
export const prefersHighContrast = (): boolean => {
	return window.matchMedia?.('(prefers-contrast: high)').matches;
};

// Apply motion preferences
export const applyMotionPreferences = (): void => {
	if (prefersReducedMotion()) {
		document.documentElement.classList.add('reduce-motion');
	}

	if (prefersHighContrast()) {
		document.documentElement.classList.add('high-contrast');
	}
};

// Focus management utilities
export const createFocusRing = (element: HTMLElement): void => {
	element.classList.add('focus-visible');
};

export const removeFocusRing = (element: HTMLElement): void => {
	element.classList.remove('focus-visible');
};

// Color contrast utilities
export const meetsContrastRequirement = (foreground: string, background: string): boolean => {
	// This is a simplified check - in production, you'd want a proper contrast ratio calculation
	const fg = parseInt(foreground.replace('#', ''), 16);
	const bg = parseInt(background.replace('#', ''), 16);
	const contrast = Math.abs(fg - bg);
	return contrast > 0x777777; // Simplified WCAG AA approximation
};
