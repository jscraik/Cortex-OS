import { StdioHttpBridge } from '@cortex-os/mcp-bridge';

let httpEndpoint;
let initial = '';

process.stdin.once('data', (chunk) => {
    initial += chunk.toString();
    const line = initial.split(/\r?\n/)[0];
    try {
        const meta = JSON.parse(line);
        httpEndpoint = `http://localhost:${meta.serverPort}`;
        const bridge = new StdioHttpBridge({ httpEndpoint });
        // start reading remaining stdin after meta line
        bridge.start();
    } catch (e) {
        process.stderr.write('Failed to parse server meta: ' + e + '\n');
        process.exit(1);
    }
});
