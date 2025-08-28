/**
 * ASBR Configuration Management
 * Handles loading and validation of configuration files from XDG directories
 */

import { readFile, writeFile } from 'fs/promises';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import {
  ConfigSchema,
  ValidationError,
  VersionPinsSchema,
  type Config,
  type MCPAllowlistEntry,
  type SecurityPolicy,
  type VersionPins,
} from '../types/index.js';
import { getConfigPath, pathExists } from '../xdg/index.js';

/**
 * Default ASBR configuration
 */
export const DEFAULT_CONFIG: Config = {
  events: {
    transport: 'socket',
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
    throw new ValidationError(
      `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
      {
        path: configPath,
        originalError: error,
      },
    );
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
    throw new ValidationError(
      `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
      {
        path: configPath,
        originalError: error,
      },
    );
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
    throw new ValidationError(
      `Failed to load MCP allowlist: ${error instanceof Error ? error.message : String(error)}`,
      {
        path: allowlistPath,
        originalError: error,
      },
    );
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
    throw new ValidationError(
      `Failed to save MCP allowlist: ${error instanceof Error ? error.message : String(error)}`,
      {
        path: allowlistPath,
        originalError: error,
      },
    );
  }
}

/**
 * Load version pins from version-pins.yaml
 */
export async function loadVersionPins(): Promise<VersionPins> {
  const pinsPath = getConfigPath('version-pins.yaml');

  if (!(await pathExists(pinsPath))) {
    return {};
  }

  try {
    const content = await readFile(pinsPath, 'utf-8');
    const rawData = yamlLoad(content);

    const result = VersionPinsSchema.safeParse(rawData);
    if (!result.success) {
      throw new ValidationError('Invalid version pins', {
        errors: result.error.errors,
        path: pinsPath,
      });
    }

    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      `Failed to load version pins: ${error instanceof Error ? error.message : String(error)}`,
      {
        path: pinsPath,
        originalError: error,
      },
    );
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
      const filePath = getConfigPath(`policies/${file}`);
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
    throw new ValidationError(
      `Failed to load security policies: ${error instanceof Error ? error.message : String(error)}`,
      {
        originalError: error,
      },
    );
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
