module.exports = {
	forbidden: [
		{
			name: 'no-legacy-memories',
			severity: 'error',
			from: {},
			to: {
				path: 'packages/memories',
			},
		},
	],
};
