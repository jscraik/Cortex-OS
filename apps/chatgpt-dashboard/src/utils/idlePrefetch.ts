type IdleDeadline = {
	timeRemaining: () => number;
};

const requestIdle =
	(typeof window !== 'undefined' && (window as any).requestIdleCallback
		? (window as any).requestIdleCallback.bind(window)
		: (callback: (deadline: IdleDeadline) => void) =>
				setTimeout(() => callback({ timeRemaining: () => 0 }), 500));

export function idlePrefetch(callback: () => void) {
	requestIdle((deadline: IdleDeadline) => {
		if (deadline.timeRemaining() > 0) {
			callback();
		} else {
			callback();
		}
	});
}
