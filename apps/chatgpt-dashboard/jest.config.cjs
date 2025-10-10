module.exports = {
	rootDir: '.',
	testEnvironment: 'jsdom',
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest'
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
	setupFilesAfterEnv: ['@testing-library/jest-dom'],
	testMatch: ['<rootDir>/src/**/*.test.(ts|tsx)'],
	collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
