type SetupState = {
	connectorsPid: number;
	asbrPid: number;
};

function terminateProcessTree(pid?: number) {
	if (!pid || pid <= 0) {
		return;
	}
	try {
		process.kill(-pid, 'SIGTERM');
	} catch {
		try {
			process.kill(pid, 'SIGTERM');
		} catch {
			// ignore
		}
	}
}

export default async function globalTeardown(state: SetupState) {
	terminateProcessTree(state?.connectorsPid);
	terminateProcessTree(state?.asbrPid);
}
