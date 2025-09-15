#!/usr/bin/env node
// Robust echo server for stdio buffering test
process.on('uncaughtException', (err) => {
	console.error('UNCAUGHT', err?.message);
});

let id = 0;
let buf = '';
function flushLine(line) {
	if (!line || !line.trim()) return;
	let req;
	try {
		req = JSON.parse(line);
	} catch (e) {
		console.error('parse error', e?.message);
		return;
	}
	try {
		process.stdout.write(`${JSON.stringify({ id: ++id, echo: req.name })}\n`);
	} catch (e) {
		console.error('write error', e?.message);
	}
}

process.stdin.on('data', (d) => {
	buf += d.toString();
	let idx = buf.indexOf('\n');
	while (idx !== -1) {
		const line = buf.slice(0, idx);
		buf = buf.slice(idx + 1);
		flushLine(line);
		idx = buf.indexOf('\n');
	}
});

process.stdin.on('end', () => {
	if (buf.length) flushLine(buf);
});
