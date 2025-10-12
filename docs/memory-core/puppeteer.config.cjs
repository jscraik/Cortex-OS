const { join } = require('node:path');
const { homedir } = require('node:os');

module.exports = {
	executablePath: join(
		process.env.PUPPETEER_CACHE_DIR || `${homedir()}/.cache/puppeteer`,
		'chrome-headless-shell',
		'mac_arm-141.0.7390.76',
		'chrome-headless-shell-mac-arm64',
		'chrome-headless-shell',
	),
};
