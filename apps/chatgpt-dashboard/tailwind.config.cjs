const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
	content: ['./src/**/*.{ts,tsx,js,jsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', ...defaultTheme.fontFamily.sans],
			},
			colors: {
				brand: {
					accent: '#4F46E5',
				},
				status: {
					green: '#10B981',
					'green-bg': '#ECFDF3',
					red: '#EF4444',
					'red-bg': '#FEE2E2',
					yellow: '#F59E0B',
					'yellow-bg': '#FEF3C7',
					blue: '#3B82F6',
					'blue-bg': '#EFF6FF',
				},
			},
		},
	},
	plugins: [],
};
