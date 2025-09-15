import { EventEmitter } from 'events';
import * as fsp from 'fs/promises';
import { watchFile, unwatchFile, watch } from 'fs';

/**
 * PolicyHotReloader - Runtime reload of guard/policy configs without restart
 * 
 * Provides file watching and hot-reload capabilities for policy configuration files.
 * Emits events on successful reload, validation errors, and file system errors.
 * 
 * Events:
 * - 'policyReloaded': (policy: any) => void - Policy successfully reloaded
 * - 'validationError': (error: Error) => void - Policy validation failed
 * - 'parseError': (error: Error) => void - JSON parsing failed
 * - 'fileDeleted': () => void - Policy file was deleted
 * - 'policyError': (error: Error) => void - General policy-related error
 */
export class PolicyHotReloader extends EventEmitter {
  private currentPolicy: any = null;
  private readonly policyFilePath: string;
  private isWatching: boolean = false;
  private lastSerialized: string | null = null;
  private reloadTimer: NodeJS.Timeout | null = null;
  private fileMissing: boolean = false;
  private poller: NodeJS.Timeout | null = null;

  constructor(policyFilePath: string) {
    super();
    this.policyFilePath = policyFilePath;
    // Debug identifier to ensure TS implementation is used in tests
    // (Remove or gate behind env flag in production if needed)
    if (process.env.POLICY_RELOADER_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[PolicyHotReloader-TS] initialized with', policyFilePath);
    }
  }

  /**
   * Start watching the policy file for changes
   */
  async startWatching(): Promise<void> {
    if (this.isWatching) return;
  // Initial load (do not emit policyReloaded until we have valid policy)
  await this.loadPolicyFromFile({ initial: true });

    // Polling watcher for mtime/content change (stable cross-platform)
    watchFile(this.policyFilePath, { interval: 250 }, (curr, prev) => {
      // Detect deletion (size 0 after previously existing OR inode change with missing file)
      if (curr.nlink === 0 || (curr.size === 0 && prev.size > 0)) {
        if (!this.fileMissing) {
          this.fileMissing = true;
          this.emit('fileDeleted');
        }
        return;
      }
      if (curr.mtimeMs !== prev.mtimeMs) {
        this.scheduleReload('mtime-change');
      }
    });

    // Event watcher to catch deletes / renames / recreation quickly
    try {
      watch(this.policyFilePath, (eventType) => {
        if (eventType === 'rename') {
          fsp.access(this.policyFilePath)
            .then(() => {
              // File recreated after deletion
              if (this.fileMissing) {
                this.fileMissing = false;
              }
              this.scheduleReload('recreated');
            })
            .catch(() => {
              if (!this.fileMissing) {
                this.fileMissing = true;
                this.emit('fileDeleted');
              }
            });
        } else if (eventType === 'change') {
          // Direct reload attempt for faster propagation in tests
          this.loadPolicyFromFile().catch(e => this.emit('policyError', e));
        }
      });
    } catch (err) {
      // fs.watch can fail on some network FS – log & continue with watchFile only
      this.emit('policyError', new Error(`fs.watch unavailable: ${err instanceof Error ? err.message : String(err)}`));
    }

    this.isWatching = true;

    // Start lightweight polling as a reliability fallback (tests need deterministic behavior)
    this.poller ??= setInterval(() => {
      void this.pollCheck();
    }, 120);
  }

  /**
   * Stop watching the policy file
   */
  async stopWatching(): Promise<void> {
    if (!this.isWatching) return;
    unwatchFile(this.policyFilePath);
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = null;
    }
    this.isWatching = false;
  }

  /**
   * Get the current policy
   */
  getCurrentPolicy(): any {
    return this.currentPolicy;
  }

  /**
   * Load policy from file with validation
   */
  private async loadPolicyFromFile(opts: { initial?: boolean } = {}): Promise<void> {
    try {
      const fileContent = await fsp.readFile(this.policyFilePath, 'utf-8');
      let parsedPolicy: any;
      try {
        parsedPolicy = JSON.parse(fileContent);
      } catch (parseError) {
        this.emit('parseError', new Error(`JSON parse error in ${this.policyFilePath}: ${parseError instanceof Error ? parseError.message : String(parseError)}`));
        return;
      }

      if (!this.validatePolicyStructure(parsedPolicy)) {
        this.emit('validationError', new Error('Policy validation failed: missing required fields'));
        return;
      }

      const serialized = JSON.stringify(parsedPolicy);
      const isChange = this.lastSerialized !== serialized;
      if (opts.initial) {
        // Set baseline without emitting (tests expect first policyReloaded to correspond to a change)
        this.lastSerialized = serialized;
        this.currentPolicy = parsedPolicy;
        return;
      }
      if (isChange) {
        this.lastSerialized = serialized;
        this.currentPolicy = parsedPolicy;
        if (process.env.POLICY_RELOADER_DEBUG) {
          // eslint-disable-next-line no-console
          console.log('[PolicyHotReloader-TS] emitting policyReloaded version', this.currentPolicy.version);
        }
        this.emit('policyReloaded', this.currentPolicy);
      }
    } catch (fileError) {
      this.emit('policyError', new Error(`Failed to read policy file ${this.policyFilePath}: ${fileError instanceof Error ? fileError.message : String(fileError)}`));
    }
  }

  private scheduleReload(reason: string): void {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.loadPolicyFromFile().catch((e) => this.emit('policyError', e));
    }, 5); // minimal debounce for deterministic test timing
  }

  /**
   * Polling fallback: attempts to read file and detect content change or recreation.
   */
  private async pollCheck(): Promise<void> {
    try {
      const fileContent = await fsp.readFile(this.policyFilePath, 'utf-8');
      if (this.fileMissing) {
        // File was previously missing; treat as recreation trigger reload
        this.fileMissing = false;
      }
      let parsed: any;
      try {
        parsed = JSON.parse(fileContent);
      } catch (e) {
        this.emit('parseError', new Error(`JSON parse error in ${this.policyFilePath}: ${e instanceof Error ? e.message : String(e)}`));
        return; // keep last good policy
      }
      if (!this.validatePolicyStructure(parsed)) {
        this.emit('validationError', new Error('Policy validation failed: missing required fields'));
        return;
      }
      const serialized = JSON.stringify(parsed);
      if (this.lastSerialized === null) {
        // baseline loaded previously by initial load; skip here
        return;
      }
      if (serialized !== this.lastSerialized) {
        this.lastSerialized = serialized;
        this.currentPolicy = parsed;
        this.emit('policyReloaded', this.currentPolicy);
      }
    } catch (e) {
      if (!this.fileMissing) {
        this.fileMissing = true;
        this.emit('fileDeleted');
      }
      // Surface underlying error once for observability
      this.emit('policyError', new Error(`Polling read failed: ${e instanceof Error ? e.message : String(e)}`));
    }
  }

  /**
   * Basic policy structure validation
   */
  private validatePolicyStructure(policy: any): boolean {
    // Check for required fields based on the structure we saw in policy.json
    if (!policy || typeof policy !== 'object') {
      return false;
    }

    // Must have version
    if (!policy.version || typeof policy.version !== 'string') {
      return false;
    }

    // Must have allowedPaths (can be empty object)
    if (!policy.allowedPaths || typeof policy.allowedPaths !== 'object') {
      return false;
    }

    // Other fields are optional but if present, should be arrays
    const arrayFields = ['allowedGlobs', 'deniedGlobs', 'protectedFiles'];
    for (const field of arrayFields) {
      if (policy[field] !== undefined && !Array.isArray(policy[field])) {
        return false;
      }
    }

    return true;
  }
}
