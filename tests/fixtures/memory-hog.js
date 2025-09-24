import { Buffer } from 'node:buffer';

const data = [];
setInterval(() => {
	data.push(Buffer.alloc(20 * 1024 * 1024));
	const totalAllocations = data.length;
	if (totalAllocations > 1024) {
		data.splice(0, totalAllocations - 1024);
	}
}, 20);
setTimeout(() => {}, 1e9);
