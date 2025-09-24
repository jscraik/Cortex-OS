/* eslint-env node */
// eslint-disable-next-line no-unused-vars
const data = [];
setInterval(() => {
	data.push(Buffer.alloc(20 * 1024 * 1024));
}, 20);
setTimeout(() => {}, 1e9);
