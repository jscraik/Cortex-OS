/**
 * ASBR Configuration Management
 * Handles loading and validation of configuration files from XDG directories
 */

import { readFile, writeFile } from 'fs/promises';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import { getConfigPath, pathExists } from '../xdg/index.js';
import {
  ConfigSchema,
  type Config,
  type MCPAllowlistEntry,
  type SecurityPolicy,
} from '../types/index.js';
import { ValidationError } from '../types/index.js';

/**
 * Default ASBR configuration
 */
export const DEFAULT_CONFIG: Config = {
  events: {
    transport: 'sse',
    poll_interval_ms: 1500,
    heartbeat_ms: 10000,
    idle_timeout_ms: 60000,
    backoff: {
      base_ms: 500,
      max_ms: 8000,
      factor: 2.0,
    },
  },
  determinism: {
    max_normalize_bytes: 5_000_000,
    max_concurrency: 4,
    normalize: {
      newline: 'LF',
      trim_trailing_ws: true,
      strip_dates: true,
    },
  },
};

/**
 * Load configuration from config.yaml
 */
export async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath('config.yaml');

  if (!(await pathExists(configPath))) {
    // Create default config if it doesn't exist
    await saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const rawConfig = yamlLoad(content);

    // Validate against schema
    const result = ConfigSchema.safeParse(rawConfig);
    if (!result.success) {
      throw new ValidationError('Invalid configuration', {
        errors: result.error.errors,
        path: configPath,
      });
    }

    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to load configuration: ${error.message}`, {
      path: configPath,
      originalError: error,
    });
  }
}

/**
 * Save configuration to config.yaml
 */
export async function saveConfig(config: Config): Promise<void> {
  // Validate before saving
  const result = ConfigSchema.safeParse(config);
  if (!result.success) {
    throw new ValidationError('Invalid configuration', {
      errors: result.error.errors,
    });
  }

  const configPath = getConfigPath('config.yaml');
  const yamlContent = yamlDump(config, {
    indent: 2,
    lineWidth: 100,
    quotingType: '"',
  });

  try {
    await writeFile(configPath, yamlContent, 'utf-8');
  } catch (error) {
    throw new ValidationError(`Failed to save configuration: ${error.message}`, {
      path: configPath,
      originalError: error,
    });
  }
}

/**
 * Load MCP allowlist from mcp-allowlist.yaml
 */
export async function loadMCPAllowlist(): Promise<MCPAllowlistEntry[]> {
  const allowlistPath = getConfigPath('mcp-allowlist.yaml');

  if (!(await pathExists(allowlistPath))) {
    return [];
  }

  try {
    const content = await readFile(allowlistPath, 'utf-8');
    const rawData = yamlLoad(content);

    if (!Array.isArray(rawData)) {
      throw new ValidationError('MCP allowlist must be an array');
    }

    // Basic validation - could be enhanced with Zod schema
    for (const entry of rawData) {
      if (!entry.name || !entry.version) {
        throw new ValidationError('MCP allowlist entries must have name and version');
      }
    }

    return rawData as MCPAllowlistEntry[];
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to load MCP allowlist: ${error.message}`, {
      path: allowlistPath,
      originalError: error,
    });
  }
}

/**
 * Save MCP allowlist to mcp-allowlist.yaml
 */
export async function saveMCPAllowlist(allowlist: MCPAllowlistEntry[]): Promise<void> {
  const allowlistPath = getConfigPath('mcp-allowlist.yaml');
  const yamlContent = yamlDump(allowlist, {
    indent: 2,
    lineWidth: 100,
  });

  try {
    await writeFile(allowlistPath, yamlContent, 'utf-8');
  } catch (error) {
    throw new ValidationError(`Failed to save MCP allowlist: ${error.message}`, {
      path: allowlistPath,
      originalError: error,
    });
  }
}

/**
 * Load version pins from version-pins.yaml
 */
export async function loadVersionPins(): Promise<Record<string, string>> {
  const pinsPath = getConfigPath('version-pins.yaml');

  if (!(await pathExists(pinsPath))) {
    return {};
  }

  try {
    const content = await readFile(pinsPath, 'utf-8');
    const rawData = yamlLoad(content);

    if (typeof rawData !== 'object' || rawData === null) {
      throw new ValidationError('Version pins must be an object');
    }

    return rawData as Record<string, string>;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to load version pins: ${error.message}`, {
      path: pinsPath,
      originalError: error,
    });
  }
}

/**
 * Load security policies from policies/ directory
 */
export async function loadSecurityPolicies(): Promise<SecurityPolicy[]> {
  const policiesDir = getConfigPath('policies');

  if (!(await pathExists(policiesDir))) {
    return [];
  }

  try {
    const { readdir } = await import('fs/promises');
    const files = await readdir(policiesDir);
    const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

    const policies: SecurityPolicy[] = [];

    for (const file of yamlFiles) {
      const filePath = getConfigPath('policies', file);
      const content = await readFile(filePath, 'utf-8');
      const policy = yamlLoad(content) as SecurityPolicy;

      if (!policy.id || !policy.name || !Array.isArray(policy.rules)) {
        throw new ValidationError(`Invalid security policy in ${file}`);
      }

      policies.push(policy);
    }

    return policies;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to load security policies: ${error.message}`, {
      originalError: error,
    });
  }
}

/**
 * Get merged configuration with all settings
 */
export async function getFullConfig() {
  const [config, mcpAllowlist, versionPins, securityPolicies] = await Promise.all([
    loadConfig(),
    loadMCPAllowlist(),
    loadVersionPins(),
    loadSecurityPolicies(),
  ]);

  return {
    config,
    mcpAllowlist,
    versionPins,
    securityPolicies,
  };
}
