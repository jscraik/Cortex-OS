// Lightweight winston mock used in tests
export default {
	createLogger: () => ({
		info: () => {},
		warn: () => {},
		error: () => {},
		debug: () => {},
		child: () => ({
			info: () => {},
			warn: () => {},
			error: () => {},
			debug: () => {},
		}),
	}),
	format: {
		json: () => ({}),
		simple: () => ({}),
                combine: (..._args: unknown[]) => ({}),
		timestamp: () => ({}),
	},
	transports: {
		Console: function Console() {},
	},
};
