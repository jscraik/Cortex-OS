import { createEnhancedClient } from '@cortex-os/mcp-core/client';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// spawn server to discover port
const server = spawn(process.execPath, [resolve(__dirname, 'server.mjs')]);
let serverPort;

server.stdout.once('data', async (chunk) => {
    const meta = JSON.parse(chunk.toString());
    serverPort = meta.serverPort;

    // spawn bridge process; send meta line containing server port
    const bridge = spawn(process.execPath, [resolve(__dirname, 'bridge.mjs')]);
    bridge.stdin.write(JSON.stringify({ serverPort }) + '\n');

    const client = await createEnhancedClient({
        name: 'example-stdio-bridge',
        transport: 'stdio',
        command: process.execPath,
        args: [resolve(__dirname, 'bridge.mjs')],
    });

    const res = await client.callTool({ name: 'tools.list' });
    console.log('Result from tool call via bridge:', res);
    await client.close();
    bridge.kill();
    server.kill();
});
