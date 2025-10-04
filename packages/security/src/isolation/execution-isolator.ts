/**
 * @file Execution Isolation System
 * @description Sandbox tier for risky tool execution in zero-trust environment
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Logger } from 'pino';

const DEFAULT_BRANDING = 'brAInwav Execution Isolation';

export interface SandboxConfig {
    /** Sandbox type */
    type: 'gvisor' | 'firecracker' | 'kata' | 'docker';
    /** CPU limit (cores) */
    cpu_limit?: number;
    /** Memory limit (MB) */
    memory_limit?: number;
    /** Execution timeout (seconds) */
    timeout_seconds?: number;
    /** Network access allowed */
    network_enabled?: boolean;
    /** Filesystem access mode */
    filesystem_mode: 'readonly' | 'tmpfs' | 'restricted';
    /** Additional security options */
    security_options?: string[];
}

export interface ExecutionRequest {
    /** Command to execute */
    command: string;
    /** Command arguments */
    args: string[];
    /** Working directory (within sandbox) */
    working_directory?: string;
    /** Environment variables */
    environment?: Record<string, string>;
    /** Input data to provide to process */
    stdin_data?: string;
    /** Timeout override for this execution */
    timeout_seconds?: number;
    /** Files to inject into sandbox */
    files?: Array<{ path: string; content: string; mode?: number }>;
}

export interface ExecutionResult {
    /** Exit code */
    exit_code: number;
    /** Standard output */
    stdout: string;
    /** Standard error */
    stderr: string;
    /** Execution duration in milliseconds */
    duration_ms: number;
    /** Whether execution timed out */
    timed_out: boolean;
    /** Sandbox metadata */
    sandbox_info: {
        type: string;
        container_id?: string;
        resource_usage?: {
            cpu_time_ms: number;
            memory_peak_mb: number;
        };
    };
    /** brAInwav branding */
    branding: string;
}

export class ExecutionIsolator {
    private readonly logger: Logger;
    private readonly activeSandboxes = new Map<string, ChildProcess>();

    constructor(
        private readonly config: SandboxConfig,
        logger: Logger,
    ) {
        this.logger = logger.child({
            component: 'execution-isolator',
            branding: DEFAULT_BRANDING,
        });
    }

    /**
     * Execute a command in an isolated sandbox
     */
    async executeIsolated(request: ExecutionRequest): Promise<ExecutionResult> {
        const start = Date.now();
        const sandbox_id = `sandbox-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;

        try {
            this.logger.info(
                {
                    sandbox_id,
                    command: request.command,
                    sandbox_type: this.config.type,
                    branding: DEFAULT_BRANDING,
                },
                'Starting isolated execution',
            );

            // Create sandbox based on type
            const result = await this.executeBySandboxType(sandbox_id, request);

            const duration_ms = Date.now() - start;

            this.logger.info(
                {
                    sandbox_id,
                    exit_code: result.exit_code,
                    duration_ms,
                    timed_out: result.timed_out,
                    branding: DEFAULT_BRANDING,
                },
                'Isolated execution completed',
            );

            return {
                ...result,
                duration_ms,
                branding: DEFAULT_BRANDING,
            };
        } catch (error) {
            const duration_ms = Date.now() - start;

            this.logger.error(
                {
                    sandbox_id,
                    error: error instanceof Error ? error.message : 'unknown error',
                    duration_ms,
                    branding: DEFAULT_BRANDING,
                },
                'Isolated execution failed',
            );

            return {
                exit_code: -1,
                stdout: '',
                stderr: error instanceof Error ? error.message : 'Execution failed',
                duration_ms,
                timed_out: false,
                sandbox_info: {
                    type: this.config.type,
                },
                branding: DEFAULT_BRANDING,
            };
        }
    }

    private async executeBySandboxType(
        sandbox_id: string,
        request: ExecutionRequest,
    ): Promise<Omit<ExecutionResult, 'duration_ms' | 'branding'>> {
        switch (this.config.type) {
            case 'gvisor':
                return this.executeWithGVisor(sandbox_id, request);
            case 'firecracker':
                return this.executeWithFirecracker(sandbox_id, request);
            case 'kata':
                return this.executeWithKata(sandbox_id, request);
            case 'docker':
                return this.executeWithDocker(sandbox_id, request);
            default:
                throw new Error(`brAInwav unsupported sandbox type: ${this.config.type}`);
        }
    }

    private async executeWithGVisor(
        sandbox_id: string,
        request: ExecutionRequest,
    ): Promise<Omit<ExecutionResult, 'duration_ms' | 'branding'>> {
        // Create temporary directory for sandbox
        const tempDir = await mkdtemp(join(tmpdir(), 'brainwav-gvisor-'));

        try {
            // Write files to sandbox
            await this.prepareFiles(tempDir, request.files);

            // Build runsc command
            const runscArgs = [
                'run',
                '--network=none',
                '--file-access=shared',
                `--root=${tempDir}`,
                '--platform=systrap',
                '--debug=false',
            ];

            // Add resource limits
            if (this.config.cpu_limit) {
                runscArgs.push(`--cpu=${this.config.cpu_limit}`);
            }
            if (this.config.memory_limit) {
                runscArgs.push(`--memory=${this.config.memory_limit}MB`);
            }

            runscArgs.push(sandbox_id);

            // Execute with runsc
            return await this.executeProcess('runsc', runscArgs, request, tempDir);
        } finally {
            // Cleanup
            await rm(tempDir, { recursive: true, force: true });
        }
    }

    private async executeWithFirecracker(
        _sandbox_id: string,
        _request: ExecutionRequest,
    ): Promise<Omit<ExecutionResult, 'duration_ms' | 'branding'>> {
        // Firecracker requires more complex setup with VM configuration
        // This is a simplified implementation
        throw new Error('brAInwav Firecracker sandbox not yet implemented');
    }

    private async executeWithKata(
        sandbox_id: string,
        request: ExecutionRequest,
    ): Promise<Omit<ExecutionResult, 'duration_ms' | 'branding'>> {
        // Kata containers integration
        const dockerArgs = [
            'run',
            '--rm',
            '--runtime=kata-runtime',
            '--name',
            sandbox_id,
            '--network=none',
            '--security-opt=no-new-privileges:true',
            '--cap-drop=ALL',
        ];

        // Add resource limits
        if (this.config.cpu_limit) {
            dockerArgs.push(`--cpus=${this.config.cpu_limit}`);
        }
        if (this.config.memory_limit) {
            dockerArgs.push(`--memory=${this.config.memory_limit}m`);
        }

        // Use minimal container image
        dockerArgs.push('alpine:latest');
        dockerArgs.push(request.command);
        dockerArgs.push(...request.args);

        return await this.executeProcess('docker', dockerArgs, request);
    }

    private async executeWithDocker(
        sandbox_id: string,
        request: ExecutionRequest,
    ): Promise<Omit<ExecutionResult, 'duration_ms' | 'branding'>> {
        const tempDir = await mkdtemp(join(tmpdir(), 'brainwav-docker-'));

        try {
            // Prepare files
            await this.prepareFiles(tempDir, request.files);

            const dockerArgs = [
                'run',
                '--rm',
                '--name',
                sandbox_id,
                '--security-opt=no-new-privileges:true',
                '--cap-drop=ALL',
                '--read-only',
            ];

            // Network isolation
            if (!this.config.network_enabled) {
                dockerArgs.push('--network=none');
            }

            // Resource limits
            if (this.config.cpu_limit) {
                dockerArgs.push(`--cpus=${this.config.cpu_limit}`);
            }
            if (this.config.memory_limit) {
                dockerArgs.push(`--memory=${this.config.memory_limit}m`);
            }

            // Mount files if any
            if (request.files?.length) {
                dockerArgs.push('-v', `${tempDir}:/sandbox:ro`);
                dockerArgs.push('-w', '/sandbox');
            }

            // Environment variables
            if (request.environment) {
                for (const [key, value] of Object.entries(request.environment)) {
                    dockerArgs.push('-e', `${key}=${value}`);
                }
            }

            // Use minimal container image
            dockerArgs.push('alpine:latest');
            dockerArgs.push(request.command);
            dockerArgs.push(...request.args);

            return await this.executeProcess('docker', dockerArgs, request, tempDir);
        } finally {
            // Cleanup
            await rm(tempDir, { recursive: true, force: true });
        }
    }

    private async prepareFiles(
        baseDir: string,
        files?: Array<{ path: string; content: string; mode?: number }>,
    ): Promise<void> {
        if (!files?.length) return;

        for (const file of files) {
            const filePath = join(baseDir, file.path);
            await writeFile(filePath, file.content, 'utf8');

            if (file.mode) {
                await chmod(filePath, file.mode);
            }
        }
    }

    private async executeProcess(
        command: string,
        args: string[],
        request: ExecutionRequest,
        workingDir?: string,
    ): Promise<Omit<ExecutionResult, 'duration_ms' | 'branding'>> {
        return new Promise((resolve) => {
            const timeout = (request.timeout_seconds ?? this.config.timeout_seconds ?? 30) * 1000;
            let stdout = '';
            let stderr = '';
            let timed_out = false;

            const process = spawn(command, args, {
                cwd: workingDir || request.working_directory,
                env: request.environment,
            });

            // Set up timeout
            const timeoutHandle = setTimeout(() => {
                timed_out = true;
                process.kill('SIGKILL');
            }, timeout);

            // Collect output
            process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            // Handle stdin
            if (request.stdin_data) {
                process.stdin?.write(request.stdin_data);
                process.stdin?.end();
            }

            process.on('close', (code) => {
                clearTimeout(timeoutHandle);

                resolve({
                    exit_code: code ?? -1,
                    stdout,
                    stderr,
                    timed_out,
                    sandbox_info: {
                        type: this.config.type,
                        container_id: args.find((arg) => arg.startsWith('sandbox-')),
                    },
                });
            });

            process.on('error', (error) => {
                clearTimeout(timeoutHandle);

                resolve({
                    exit_code: -1,
                    stdout: '',
                    stderr: `brAInwav process error: ${error.message}`,
                    timed_out: false,
                    sandbox_info: {
                        type: this.config.type,
                    },
                });
            });
        });
    }

    /**
     * Kill all active sandboxes
     */
    async killAllSandboxes(): Promise<void> {
        const killPromises = Array.from(this.activeSandboxes.entries()).map(
            async ([sandbox_id, process]) => {
                try {
                    process.kill('SIGTERM');

                    // Give process time to terminate gracefully
                    await new Promise((resolve) => setTimeout(resolve, 5000));

                    if (!process.killed) {
                        process.kill('SIGKILL');
                    }

                    this.activeSandboxes.delete(sandbox_id);

                    this.logger.info(
                        {
                            sandbox_id,
                            branding: DEFAULT_BRANDING,
                        },
                        'Sandbox terminated',
                    );
                } catch (error) {
                    this.logger.error(
                        {
                            sandbox_id,
                            error: error instanceof Error ? error.message : 'unknown error',
                            branding: DEFAULT_BRANDING,
                        },
                        'Failed to terminate sandbox',
                    );
                }
            },
        );

        await Promise.all(killPromises);
    }

    /**
     * Get sandbox statistics
     */
    getSandboxStats(): {
        active_sandboxes: number;
        sandbox_type: string;
        config: SandboxConfig;
    } {
        return {
            active_sandboxes: this.activeSandboxes.size,
            sandbox_type: this.config.type,
            config: this.config,
        };
    }
}
