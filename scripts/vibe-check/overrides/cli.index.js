#!/usr/bin/env node
import { promises as fsPromises, readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Command, Option } from 'commander';
import claudeAdapter from './clients/claude.js';
import cursorAdapter from './clients/cursor.js';
import { isRecord } from './clients/shared.js';
import vscodeAdapter from './clients/vscode.js';
import windsurfAdapter from './clients/windsurf.js';
import { formatUnifiedDiff } from './diff.js';
import { checkNodeVersion, detectEnvFiles, portStatus, readEnvFile } from './doctor.js';
import { ensureEnv, resolveEnvSources } from './env.js';

console.log('brAInwav-vibe-check: CLI invoked');
const cliDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(cliDir, '..', '..');
const entrypoint = resolve(projectRoot, 'build', 'index.js');
const packageJsonPath = resolve(projectRoot, 'package.json');
const MANAGED_ID = 'vibe-check-mcp';
const SENTINEL = 'vibe-check-mcp-cli';
const CLIENT_ADAPTERS = {
	claude: claudeAdapter,
	cursor: cursorAdapter,
	windsurf: windsurfAdapter,
	vscode: vscodeAdapter,
};
function readPackageJson() {
	const raw = readFileSync(packageJsonPath, 'utf8');
	return JSON.parse(raw);
}
function parsePort(value) {
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed) || parsed <= 0) {
		throw new Error(`Invalid port: ${value}`);
	}
	return parsed;
}
function mergeEnvFromFile(env, path) {
	if (!path) {
		return;
	}
	try {
		const parsed = readEnvFile(path);
		for (const [key, value] of Object.entries(parsed)) {
			if (!(key in env)) {
				env[key] = value;
			}
		}
	} catch (error) {
		console.warn(`Failed to read env file at ${path}: ${error.message}`);
	}
}
async function runStartCommand(options) {
	const envSources = resolveEnvSources();
	const spawnEnv = { ...envSources.processEnv };
	mergeEnvFromFile(spawnEnv, envSources.homeEnv);
	mergeEnvFromFile(spawnEnv, envSources.cwdEnv);
	if (options.http && options.stdio) {
		throw new Error('Select either --stdio or --http, not both.');
	}
	const transport = resolveTransport(
		{ http: options.http, stdio: options.stdio },
		spawnEnv.MCP_TRANSPORT,
	);
	spawnEnv.MCP_TRANSPORT = transport;
	if (transport === 'http') {
		const httpPort = resolveHttpPort(options.port, spawnEnv.MCP_HTTP_PORT);
		spawnEnv.MCP_HTTP_PORT = String(httpPort);
	} else {
		if (options.port != null) {
			throw new Error('The --port option is only available when using --http.');
		}
	}
	if (options.dryRun) {
		console.log('vibe-check-mcp start (dry run)');
		console.log(`Entrypoint: ${process.execPath} ${entrypoint}`);
		console.log('Environment overrides:');
		console.log(`  MCP_TRANSPORT=${spawnEnv.MCP_TRANSPORT}`);
		if (transport === 'http' && spawnEnv.MCP_HTTP_PORT) {
			console.log(`  MCP_HTTP_PORT=${spawnEnv.MCP_HTTP_PORT}`);
		}
		return;
	}
	console.log(`brAInwav-vibe-check: starting server (transport=${transport})`);
	for (const [key, value] of Object.entries(spawnEnv)) {
		if (value !== undefined) {
			process.env[key] = value;
		}
	}
	await import(pathToFileURL(entrypoint).href);
	console.log('brAInwav-vibe-check: server initialised');
	await new Promise(() => {});
}
async function runDoctorCommand(options) {
	const pkg = readPackageJson();
	const requiredNodeRange = pkg.engines?.node ?? '>=20.0.0';
	const nodeCheck = checkNodeVersion(requiredNodeRange);
	if (nodeCheck.ok) {
		console.log(`Node.js version: ${nodeCheck.current} (meets ${requiredNodeRange})`);
	} else {
		console.warn(`Node.js version: ${nodeCheck.current} (requires ${requiredNodeRange})`);
		process.exitCode = 1;
	}
	const envFiles = detectEnvFiles();
	console.log(`Project .env: ${envFiles.cwdEnv ?? 'not found'}`);
	console.log(`Home .env: ${envFiles.homeEnv ?? 'not found'}`);
	const transport = resolveTransport({ http: options.http }, process.env.MCP_TRANSPORT);
	if (transport !== 'http') {
		console.log('Using stdio transport; port checks skipped.');
		return;
	}
	const port = resolveHttpPort(options.port, process.env.MCP_HTTP_PORT);
	const status = await portStatus(port);
	console.log(`HTTP port ${port}: ${status}`);
}
async function runInstallCommand(options) {
	const clientKey = options.client?.toLowerCase();
	const adapter = clientKey ? CLIENT_ADAPTERS[clientKey] : undefined;
	if (!adapter) {
		throw new Error(`Unsupported client: ${options.client}`);
	}
	const interactive = !options.nonInteractive;
	const envResult = await ensureEnv({ interactive, local: Boolean(options.local) });
	if (envResult.missing?.length) {
		return;
	}
	if (envResult.wrote && envResult.path) {
		console.log(`Secrets written to ${envResult.path}`);
	}
	const transport = resolveTransport(
		{ http: options.http, stdio: options.stdio },
		process.env.MCP_TRANSPORT,
	);
	let httpPort;
	let httpUrl;
	if (transport === 'http') {
		httpPort = resolveHttpPort(options.port, process.env.MCP_HTTP_PORT);
		httpUrl = `http://127.0.0.1:${httpPort}`;
	} else if (options.port != null) {
		throw new Error('The --port option is only available when using --http.');
	}
	const entry = createInstallEntry(transport, httpPort);
	const mergeOptions = {
		id: MANAGED_ID,
		sentinel: SENTINEL,
		transport,
		httpUrl,
	};
	if (options.devWatch || options.devDebug) {
		mergeOptions.dev = {};
		if (options.devWatch) {
			mergeOptions.dev.watch = true;
		}
		if (options.devDebug) {
			mergeOptions.dev.debug = options.devDebug;
		}
	}
	const description = adapter.describe();
	const configPath = await adapter.locate(options.config);
	if (!configPath) {
		emitManualInstallMessage({
			adapter,
			clientKey,
			description,
			entry,
			mergeOptions,
			transport,
			httpUrl,
		});
		return;
	}
	const configExists = await fileExists(configPath);
	let existingRaw = '';
	let currentConfig = {};
	if (configExists) {
		existingRaw = await fsPromises.readFile(configPath, 'utf8');
		currentConfig = await adapter.read(configPath, existingRaw);
	}
	const { next, changed, reason } = adapter.merge(currentConfig, entry, mergeOptions);
	if (!changed) {
		if (reason) {
			console.warn(reason);
		} else {
			console.log(`${description.name} already has a managed entry for ${MANAGED_ID}.`);
		}
		return;
	}
	const nextRaw = `${JSON.stringify(next, null, 2)}\n`;
	if (options.dryRun) {
		const diff = formatUnifiedDiff(existingRaw, nextRaw, configPath);
		console.log(diff.trim() ? diff : 'No changes.');
		return;
	}
	if (existingRaw) {
		const backupPath = await createBackup(configPath, existingRaw);
		console.log(`Backup created at ${backupPath}`);
	}
	await adapter.writeAtomic(configPath, next);
	const summaryEntry = extractManagedEntry(next, MANAGED_ID);
	console.log(`${description.name} config updated (${transport}): ${configPath}`);
	if (summaryEntry) {
		console.log(JSON.stringify(summaryEntry, null, 2));
	}
	console.log('Restart the client to pick up the new MCP server.');
	if (transport === 'http' && httpPort) {
		const startCommand = formatStartCommand(entry);
		console.log(`Start the server separately with: ${startCommand}`);
		console.log(`HTTP endpoint: ${httpUrl}`);
	}
}
function createInstallEntry(transport, port) {
	const args = ['-y', '@pv-bhat/vibe-check-mcp', 'start'];
	if (transport === 'http') {
		args.push('--http');
		const resolvedPort = port ?? 2091;
		args.push('--port', String(resolvedPort));
	} else {
		args.push('--stdio');
	}
	return {
		command: 'npx',
		args,
		env: {},
	};
}
function formatStartCommand(entry) {
	const command = typeof entry.command === 'string' ? entry.command : 'npx';
	const args = Array.isArray(entry.args) ? entry.args.map((value) => String(value)) : [];
	return [command, ...args].join(' ');
}
function extractManagedEntry(config, id) {
	const mapCandidates = [];
	if (isRecord(config.mcpServers)) {
		mapCandidates.push(config.mcpServers);
	}
	if (isRecord(config.servers)) {
		mapCandidates.push(config.servers);
	}
	for (const map of mapCandidates) {
		if (!map) {
			continue;
		}
		const entry = map[id];
		if (isRecord(entry)) {
			return entry;
		}
	}
	return null;
}
function emitManualInstallMessage(args) {
	const { adapter, clientKey, description, entry, mergeOptions, transport, httpUrl } = args;
	console.log(`${description.name} configuration not found at ${description.pathHint}.`);
	if (description.notes) {
		console.log(description.notes);
	}
	const preview = adapter.merge({}, entry, mergeOptions);
	const managedEntry = extractManagedEntry(preview.next, MANAGED_ID) ?? preview.next;
	console.log('Add this MCP server configuration manually:');
	console.log(JSON.stringify(managedEntry, null, 2));
	if (clientKey === 'vscode') {
		const installUrl = createVsCodeInstallUrl(entry, mergeOptions);
		console.log('VS Code quick install link:');
		console.log(installUrl);
		console.log('Command Palette → "MCP: Add Server" will open the profile file.');
	} else if (clientKey === 'cursor') {
		console.log('Cursor → Settings → MCP Servers lets you paste this JSON.');
	} else if (clientKey === 'windsurf') {
		console.log('Create the file if it does not exist, then restart Windsurf.');
	}
	if (transport === 'http' && httpUrl) {
		const startCommand = formatStartCommand(entry);
		console.log(`Expose the HTTP server separately with: ${startCommand}`);
		console.log(`HTTP endpoint: ${httpUrl}`);
	}
}
function createVsCodeInstallUrl(entry, options) {
	const url = new URL('vscode:mcp/install');
	url.searchParams.set('name', 'Vibe Check MCP');
	const command = typeof entry.command === 'string' ? entry.command : 'npx';
	url.searchParams.set('command', command);
	const args = Array.isArray(entry.args) ? entry.args.map((value) => String(value)) : [];
	if (args.length > 0) {
		url.searchParams.set('args', JSON.stringify(args));
	}
	if (options.transport === 'http' && options.httpUrl) {
		url.searchParams.set('url', options.httpUrl);
	} else {
		url.searchParams.set('transport', options.transport);
	}
	return url.toString();
}
export function createCliProgram() {
	const pkg = readPackageJson();
	const program = new Command();
	program
		.name('vibe-check-mcp')
		.description('CLI utilities for the Vibe Check MCP server')
		.version(pkg.version ?? '0.0.0');
	program
		.command('start')
		.description('Start the Vibe Check MCP server')
		.addOption(new Option('--stdio', 'Use STDIO transport').conflicts('http'))
		.addOption(new Option('--http', 'Use HTTP transport').conflicts('stdio'))
		.option('--port <number>', 'HTTP port (default: 2091)', parsePort)
		.option('--dry-run', 'Print the resolved command without executing')
		.action(async (options) => {
			try {
				await runStartCommand(options);
			} catch (error) {
				console.error(error.message);
				process.exitCode = 1;
			}
		});
	program
		.command('doctor')
		.description('Diagnose environment issues')
		.option('--http', 'Check HTTP transport readiness')
		.option('--port <number>', 'HTTP port to inspect', parsePort)
		.action(async (options) => {
			try {
				await runDoctorCommand(options);
			} catch (error) {
				console.error(error.message);
				process.exitCode = 1;
			}
		});
	program
		.command('install')
		.description('Install client integrations')
		.requiredOption('--client <name>', 'Client to configure')
		.option('--config <path>', 'Path to the client configuration file')
		.option('--dry-run', 'Show the merged configuration without writing')
		.option('--non-interactive', 'Do not prompt for missing environment values')
		.option('--local', 'Write secrets to the project .env instead of ~/.vibe-check/.env')
		.addOption(new Option('--stdio', 'Configure STDIO transport').conflicts('http'))
		.addOption(new Option('--http', 'Configure HTTP transport').conflicts('stdio'))
		.option('--port <number>', 'HTTP port (default: 2091)', parsePort)
		.option('--dev-watch', 'Add dev.watch=true (VS Code only)')
		.option('--dev-debug <value>', 'Set dev.debug (VS Code only)')
		.action(async (options) => {
			try {
				await runInstallCommand(options);
			} catch (error) {
				console.error(error.message);
				process.exitCode = 1;
			}
		});
	return program;
}
function normalizeTransport(value) {
	if (!value) {
		return undefined;
	}
	const normalized = value.trim().toLowerCase();
	if (normalized === 'http' || normalized === 'stdio') {
		return normalized;
	}
	return undefined;
}
function resolveTransport(options, envTransport) {
	const flagTransport = options.http ? 'http' : options.stdio ? 'stdio' : undefined;
	const resolvedEnv = normalizeTransport(envTransport);
	return flagTransport ?? resolvedEnv ?? 'stdio';
}
function resolveHttpPort(optionPort, envPort) {
	if (optionPort != null) {
		return optionPort;
	}
	if (envPort) {
		const parsed = Number.parseInt(envPort, 10);
		if (!Number.isNaN(parsed) && parsed > 0) {
			return parsed;
		}
	}
	return 2091;
}
async function fileExists(path) {
	try {
		await fsPromises.access(path);
		return true;
	} catch {
		return false;
	}
}
function formatTimestamp(date) {
	const iso = date.toISOString();
	return iso.replace(/[:.]/g, '-');
}
async function createBackup(path, contents) {
	const backupPath = `${path}.${formatTimestamp(new Date())}.bak`;
	await fsPromises.writeFile(backupPath, contents, { mode: 0o600 });
	return backupPath;
}
const executedPath = process.argv[1] ? realpathSync(process.argv[1]) : undefined;
const modulePath = fileURLToPath(import.meta.url);
if (!process.argv[1] || executedPath === modulePath) {
	createCliProgram()
		.parseAsync(process.argv)
		.catch((error) => {
			console.error(error.message);
			process.exitCode = 1;
		});
}
