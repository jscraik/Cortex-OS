/** @type {import('tailwindcss').Config} */
export default {
	// Include JS/TS and CSS files plus the public HTML so utility classes
	// referenced inside CSS via `@apply` (like in `src/globals.css`) are
	// discovered by the scanner.
	content: ['./src/**/*.{js,jsx,ts,tsx,css}', './public/index.html'],
	theme: {
		extend: {},
	},
	plugins: [],
};
