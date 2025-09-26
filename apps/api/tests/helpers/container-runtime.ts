import { existsSync } from 'node:fs';
import path from 'node:path';

export type ContainerRuntimeStrategy = 'docker' | 'colima' | 'testcontainers-desktop';

export interface ContainerRuntimeDecision {
    readonly strategy: ContainerRuntimeStrategy;
    readonly available: boolean;
    readonly message?: string;
}

function resolveStrategy(): ContainerRuntimeStrategy {
    const raw = process.env.CORTEX_CONTAINER_RUNTIME?.toLowerCase();
    if (raw === 'colima' || raw === 'testcontainers-desktop') {
        return raw;
    }
    return 'docker';
}

const decision: ContainerRuntimeDecision = (() => {
    const strategy = resolveStrategy();

    if (strategy === 'docker') {
        const dockerCandidates: readonly string[] = [
            process.env.DOCKER_HOST?.startsWith('unix://')
                ? process.env.DOCKER_HOST.replace('unix://', '')
                : undefined,
            '/var/run/docker.sock',
            path.join(process.env.HOME ?? '', '.colima', 'default', 'docker.sock'),
        ];

        const available = dockerCandidates
            .filter((candidate): candidate is string => Boolean(candidate && candidate.trim().length > 0))
            .some((candidate) => existsSync(candidate));
        return {
            strategy,
            available,
            message: available
                ? undefined
                : 'Docker-compatible engine not detected. Start Docker Desktop, OrbStack, or another Docker API provider.',
        };
    }

    if (strategy === 'colima') {
        const colimaSocket = path.join(process.env.HOME ?? '', '.colima', 'default', 'docker.sock');
        const available = existsSync(colimaSocket) || existsSync('/var/run/docker.sock');
        return {
            strategy,
            available,
            message: available
                ? undefined
                : 'Colima is not running. Start it with `colima start` before executing Postgres-backed tests.',
        };
    }

    const daemonUrl = process.env.TESTCONTAINERS_DAEMON_URL ?? process.env.TESTCONTAINERS_DAEMON_HOST;
    const available = typeof daemonUrl === 'string' && daemonUrl.length > 0;
    return {
        strategy,
        available,
        message: available
            ? undefined
            : 'Testcontainers Desktop agent not detected. Launch the desktop app and export TESTCONTAINERS_DAEMON_URL to enable remote containers.',
    };
})();

export function getContainerRuntimeDecision(): ContainerRuntimeDecision {
    return decision;
}

export function logMissingRuntimeWarning(scope: string): void {
    if (decision.available || !decision.message) {
        return;
    }

    let hint: string;
    switch (decision.strategy) {
        case 'docker':
            hint = 'Ensure Docker Desktop or OrbStack is running, or set CORTEX_CONTAINER_RUNTIME to match your environment.';
            break;
        case 'colima':
            hint = 'Run `colima start` to launch the Colima VM before executing these tests.';
            break;
        default:
            hint = 'Open Testcontainers Desktop and export TESTCONTAINERS_DAEMON_URL to point at its agent.';
            break;
    }

    console.warn(
        `[${scope}] Skipping container-backed tests: ${decision.message} (strategy: ${decision.strategy}). ${hint}`,
    );
}
