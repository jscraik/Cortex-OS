#!/usr/bin/env node

/**
 * Webhook Secret Generator for GitHub Apps
 *
 * This script generates cryptographically secure webhook secrets for GitHub Apps.
 * It can be used to create secrets for AI, Semgrep, and Structure Guard apps.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const APPS = {
	ai: {
		name: 'Cortex AI GitHub App',
		envVar: 'WEBHOOK_SECRET',
		description: 'AI-powered code analysis and suggestions',
	},
	semgrep: {
		name: 'Cortex Semgrep GitHub App',
		envVar: 'SEMGREP_WEBHOOK_SECRET',
		description: 'Static security analysis with Semgrep',
	},
	structure: {
		name: 'Cortex Structure Guard GitHub App',
		envVar: 'WEBHOOK_SECRET',
		description: 'Repository structure validation and organization',
	},
	insula: {
		name: 'Insula GitHub App',
		envVar: 'INSULA_WEBHOOK_SECRET',
		description: 'Advanced repository management and automation',
	},
};

function generateSecureSecret(length = 64) {
	return crypto.randomBytes(length).toString('hex');
}

function generateBase64Secret(length = 32) {
	return crypto.randomBytes(length).toString('base64');
}

function printUsage() {
	console.log(`
🔐 Webhook Secret Generator for GitHub Apps

Usage: node generate-webhook-secret.js [options] [app]

Apps:
  ai        - ${APPS.ai.description}
  semgrep   - ${APPS.semgrep.description}
  structure - ${APPS.structure.description}
  insula    - ${APPS.insula.description}
  all       - Generate secrets for all apps

Options:
  --length, -l <number>    Secret length in bytes (default: 64)
  --base64, -b            Generate base64 encoded secret instead of hex
  --save, -s              Save to .env files in app packages
  --export, -e            Export as shell commands
  --help, -h              Show this help

Examples:
  node generate-webhook-secret.js ai
  node generate-webhook-secret.js semgrep --base64
  node generate-webhook-secret.js all --save
  node generate-webhook-secret.js structure --export
`);
}

function saveToEnvFile(appName, secret) {
	const app = APPS[appName];
	if (!app) return false;

	const packagePath = path.join(
		__dirname,
		'..',
		'packages',
		`cortex-${appName}-github`,
	);
	const envPath = path.join(packagePath, '.env');

	if (!fs.existsSync(packagePath)) {
		console.log(`⚠️  Package directory not found: ${packagePath}`);
		return false;
	}

	try {
		let envContent = '';
		if (fs.existsSync(envPath)) {
			envContent = fs.readFileSync(envPath, 'utf8');
		}

		const envVar = app.envVar;
		const newLine = `${envVar}=${secret}`;

		if (envContent.includes(`${envVar}=`)) {
			// Replace existing line
			envContent = envContent.replace(
				new RegExp(`^${envVar}=.*$`, 'm'),
				newLine,
			);
		} else {
			// Add new line
			if (envContent && !envContent.endsWith('\n')) {
				envContent += '\n';
			}
			envContent += `${newLine}\n`;
		}

		fs.writeFileSync(envPath, envContent);
		console.log(`✅ Saved ${envVar} to ${envPath}`);
		return true;
	} catch (error) {
		console.error(`❌ Failed to save to ${envPath}:`, error.message);
		return false;
	}
}

function generateForApp(appName, options = {}) {
	const app = APPS[appName];
	if (!app) {
		console.error(`❌ Unknown app: ${appName}`);
		return null;
	}

	const length = options.length || 64;
	const secret = options.base64
		? generateBase64Secret(length)
		: generateSecureSecret(length);

	console.log(`\n🔑 ${app.name}`);
	console.log(`Description: ${app.description}`);
	console.log(`Environment Variable: ${app.envVar}`);
	console.log(`Secret (${options.base64 ? 'base64' : 'hex'}): ${secret}`);

	if (options.export) {
		console.log(`Export command: export ${app.envVar}="${secret}"`);
	}

	if (options.save) {
		saveToEnvFile(appName, secret);
	}

	return secret;
}

function parseArguments(args) {
	const options = {
		length: 64,
		base64: false,
		save: false,
		export: false,
	};

	let appName = null;
	let skipNext = false;

	for (let i = 0; i < args.length; i++) {
		if (skipNext) {
			skipNext = false;
			continue;
		}

		const arg = args[i];

		switch (arg) {
			case '--length':
			case '-l':
				options.length = parseInt(args[i + 1], 10) || 64;
				skipNext = true;
				break;
			case '--base64':
			case '-b':
				options.base64 = true;
				break;
			case '--save':
			case '-s':
				options.save = true;
				break;
			case '--export':
			case '-e':
				options.export = true;
				break;
			default:
				if (!arg.startsWith('-') && !appName) {
					appName = arg;
				}
				break;
		}
	}

	return { options, appName };
}

function generateAllSecrets(options) {
	const secrets = {};
	for (const name of Object.keys(APPS)) {
		secrets[name] = generateForApp(name, options);
	}

	if (options.export) {
		console.log('\n📋 Export all commands:');
		for (const [name, secret] of Object.entries(secrets)) {
			if (secret) {
				console.log(`export ${APPS[name].envVar}="${secret}"`);
			}
		}
	}
}

function printSecurityTips() {
	console.log('\n💡 Security Tips:');
	console.log(
		'- Keep webhook secrets secure and never commit them to version control',
	);
	console.log(
		'- Use different secrets for each environment (dev, staging, prod)',
	);
	console.log('- Rotate secrets periodically for better security');
	console.log(
		'- Ensure the same secret is used in both your app and GitHub webhook settings',
	);
}

function main() {
	const args = process.argv.slice(2);

	if (args.includes('--help') || args.includes('-h') || args.length === 0) {
		printUsage();
		return;
	}

	const { options, appName } = parseArguments(args);

	if (!appName) {
		console.error('❌ Please specify an app name');
		printUsage();
		return;
	}

	console.log('🔐 GitHub App Webhook Secret Generator\n');

	if (appName === 'all') {
		generateAllSecrets(options);
	} else {
		generateForApp(appName, options);
	}

	printSecurityTips();
}

if (require.main === module) {
	main();
}

module.exports = {
	generateSecureSecret,
	generateBase64Secret,
	generateForApp,
	APPS,
};
