#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const reportPath = path.join(repoRoot, 'reports', 'observability-adoption.json');
const configPath = path.join(repoRoot, 'configs', 'observability', 'services.json');

const telemetryPatterns = [
  { label: 'otel.*', regex: /otel\.[a-z0-9_]*/i },
  { label: 'nx.telemetry.*', regex: /nx\.telemetry\.[a-z0-9_]*/i },
  { label: '@opentelemetry', regex: /@opentelemetry/i }
];

const exporterHints = [
  { type: 'OpenTelemetry', regexes: [/@opentelemetry/i, /otel\./i, /NodeSDK/i, /OTLP/i] },
  { type: 'Prometheus', regexes: [/prom-client/i, /prometheus/i] },
  { type: 'Custom', regexes: [/nx\.telemetry\./i, /customTelemetry/i] }
];

const fileExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.py']);
const ignoreDirectories = new Set(['node_modules', 'dist', 'build', '.next', '.turbo', '.cache', '__pycache__']);

async function loadConfig() {
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.services)) {
      throw new Error('Config missing "services" array');
    }
    return parsed.services;
  } catch (error) {
    throw new Error(`Failed to read observability config at ${configPath}: ${error.message}`);
  }
}

async function gatherFiles(directory) {
  let files = [];
  let entries = [];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return files;
    }
    throw error;
  }

  for (const entry of entries) {
    if (ignoreDirectories.has(entry.name) || entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await gatherFiles(fullPath);
      files = files.concat(nested);
    } else {
      const ext = path.extname(entry.name);
      if (fileExtensions.has(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function detectExporterType(contents) {
  for (const hint of exporterHints) {
    if (hint.regexes.some((regex) => regex.test(contents))) {
      return hint.type;
    }
  }
  return null;
}

async function inspectService(service) {
  const absolutePath = path.join(repoRoot, service.path);
  const files = await gatherFiles(absolutePath);
  const matches = [];
  const exporterSignals = new Set();

  for (const filePath of files) {
    let contents;
    try {
      contents = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    let matchedForFile = false;
    for (const pattern of telemetryPatterns) {
      if (pattern.regex.test(contents)) {
        matches.push({ file: path.relative(repoRoot, filePath), pattern: pattern.label });
        matchedForFile = true;
      }
    }

    const exporterType = detectExporterType(contents);
    if (exporterType) {
      exporterSignals.add(exporterType);
    }

    if (matchedForFile) {
      continue;
    }
  }

  const telemetryEnabled = matches.length > 0;
  const exporterType = telemetryEnabled
    ? [...exporterSignals][0] ?? service.expectedExporter ?? 'Custom'
    : service.expectedExporter ?? null;

  return {
    ...service,
    telemetryEnabled,
    exporterType,
    matches,
    verificationTimestamp: new Date().toISOString()
  };
}

async function main() {
  const services = await loadConfig();
  const inspected = [];
  for (const service of services) {
    const result = await inspectService(service);
    inspected.push(result);
  }

  const requiredServices = inspected.filter((service) => service.required);
  const requiredEnabled = requiredServices.filter((service) => service.telemetryEnabled);
  const coveragePercentage = requiredServices.length === 0
    ? 100
    : Math.round((requiredEnabled.length / requiredServices.length) * 100);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalServices: inspected.length,
      requiredServices: requiredServices.length,
      requiredEnabled: requiredEnabled.length,
      coveragePercentage
    },
    services: inspected
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const coverageLine = `Required telemetry coverage: ${requiredEnabled.length}/${requiredServices.length || 0} (${coveragePercentage}%)`;
  console.log(`brAInwav observability audit: ${coverageLine}`);
  console.log(`brAInwav observability audit: Report written to ${path.relative(repoRoot, reportPath)}`);

  if (requiredServices.length > 0 && requiredEnabled.length < requiredServices.length) {
    console.error('brAInwav observability audit: Observability adoption audit failed: not all required services have telemetry enabled.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`brAInwav observability audit: Observability adoption audit encountered an error: ${error.message}`);
  process.exitCode = 1;
});
