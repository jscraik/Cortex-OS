const base = require('./jest.config.cjs');

module.exports = {
	...base,
	testMatch: ['<rootDir>/src/**/*.perf.test.(ts|tsx)'],
};
