import { spawn } from 'node:child_process';
/**
 * Generate a CPU flamegraph for a Node.js script using 0x.
 * @param entry JavaScript file to profile
 * @param output Output directory for the flamegraph HTML
 */
export async function generateFlamegraph(entry, output) {
    await new Promise((resolve, reject) => {
        const child = spawn('npx', ['0x', '--output', output, entry], {
            stdio: 'inherit',
        });
        child.on('exit', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`0x exited with code ${code}`));
        });
    });
}
//# sourceMappingURL=flamegraph.js.map