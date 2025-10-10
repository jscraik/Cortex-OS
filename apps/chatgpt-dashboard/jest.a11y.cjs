const base = require('./jest.config.cjs');

module.exports = {
	...base,
	testMatch: ['<rootDir>/src/**/*.a11y.test.(ts|tsx)'],
};
