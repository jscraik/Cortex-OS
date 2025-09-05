import { initializeAuth } from '../../src/api/auth.js';
import { type ASBRServer, createASBRServer } from '../../src/api/server.js';
import { initializeXDG } from '../../src/xdg/index.js';

let sharedServer: ASBRServer | null = null;
let starting: Promise<void> | null = null;
let authToken: string | null = null;

export async function getSharedServer(port = 7450) {
    if (!process.env.ASBR_TEST_SHARED_SERVER) {
        throw new Error('ASBR_TEST_SHARED_SERVER not enabled');
    }
    if (sharedServer && authToken) return { server: sharedServer, authToken };
    if (!starting) {
        starting = (async () => {
            await initializeXDG();
            const tokenInfo = await initializeAuth();
            authToken = tokenInfo.token;
            sharedServer = createASBRServer({ port });
            await sharedServer.start();
        })();
    }
    await starting;
    if (!sharedServer || !authToken) {
        throw new Error('Shared server failed to start properly');
    }
    return { server: sharedServer, authToken };
}

export async function stopSharedServer() {
    if (sharedServer) {
        await sharedServer.stop();
        sharedServer = null;
        starting = null;
    }
}

// Auto-shutdown when process exits
process.on('exit', () => {
    if (sharedServer) {
        try {
            sharedServer.stop();
        } catch {
            /* ignore */
        }
    }
});
