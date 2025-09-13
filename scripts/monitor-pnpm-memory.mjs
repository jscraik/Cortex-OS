#!/usr/bin/env node
/**
 * scripts/monitor-pnpm-memory.mjs
 * Monitor pnpm processes for memory leaks by tracking RSS growth over time.
 *
 * Usage:
 *   node scripts/monitor-pnpm-memory.mjs [--interval=5] [--threshold=100]
 *
 * Flags:
 *   --interval=N    Sample interval in seconds (default: 5)
 *   --threshold=N   Alert threshold in MB RSS growth (default: 100)
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const interval = parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1] || '5');
const threshold = parseInt(args.find(a => a.startsWith('--threshold='))?.split('=')[1] || '100');

if (!existsSync('.memory')) mkdirSync('.memory');

console.log(`🔍 Monitoring pnpm/node processes every ${interval}s (leak threshold: ${threshold}MB)`);
console.log('PID\tELAPSED\tRSS_MB\tDELTA\tCOMMAND');
console.log('---\t-------\t------\t-----\t-------');

const processHistory = new Map();

const monitor = () => {
    try {
        const ps = execSync("ps -Ao pid,etime,rss,command | grep -E '(pnpm|node)' | grep -v grep | grep -v 'monitor-pnpm-memory'", { encoding: 'utf8' });
        const lines = ps.trim().split('\n');

        const timestamp = new Date().toISOString();
        let alerts = [];

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[0];
            const etime = parts[1];
            const rssKB = parseInt(parts[2]);
            const rssMB = Math.round(rssKB / 1024);
            const command = parts.slice(3).join(' ').substring(0, 60) + '...';

            const prev = processHistory.get(pid);
            const delta = prev ? rssMB - prev.rssMB : 0;
            const deltaStr = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0';

            processHistory.set(pid, { rssMB, timestamp, etime });

            // Alert on significant growth
            if (delta >= threshold) {
                alerts.push(`🚨 PID ${pid}: +${delta}MB growth (${rssMB}MB total)`);
            }

            const alertFlag = delta >= threshold ? '🚨' : delta > 20 ? '⚠️' : '';
            console.log(`${pid}\t${etime}\t${rssMB}\t${deltaStr}\t${alertFlag}${command}`);
        }

        if (alerts.length > 0) {
            const alertLog = `.memory/memory-alerts-${Date.now()}.txt`;
            writeFileSync(alertLog, `${timestamp}\n${alerts.join('\n')}\n`);
            console.log(`\n❗ Alerts written to ${alertLog}`);
        }

    } catch (error) {
        console.error(`Error monitoring: ${error.message}`);
    }

    setTimeout(monitor, interval * 1000);
};

// Clean up old entries (processes that no longer exist)
setInterval(() => {
    try {
        const currentPids = new Set(
            execSync("ps -Ao pid | grep -E '^[0-9]+$'", { encoding: 'utf8' })
                .trim().split('\n').map(s => s.trim()).filter(Boolean)
        );

        for (const [pid] of processHistory) {
            if (!currentPids.has(pid)) {
                processHistory.delete(pid);
            }
        }
    } catch (e) {
        // Ignore cleanup errors
    }
}, 60000); // Clean every minute

// Start monitoring
monitor();
