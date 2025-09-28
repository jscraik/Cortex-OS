import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PRISMA_SCHEMA_PATH = './prisma/schema.prisma';
const ARTIFACT_DIR = 'tmp/auth-migrations';

export interface SchemaGuardOptions {
        prismaBinary: string;
        workspaceRoot: string;
        connectionString: string;
        env: NodeJS.ProcessEnv;
        now?: () => number;
        exec?: typeof execFileAsync;
}

export interface SchemaGuardResult {
        pendingMigrations: string[];
        forwardScriptPath?: string;
        rollbackScriptPath?: string;
}

export async function collectPendingMigrations({
        prismaBinary,
        workspaceRoot,
        env,
        exec = execFileAsync,
}: Pick<SchemaGuardOptions, 'prismaBinary' | 'workspaceRoot' | 'env' | 'exec'>): Promise<string[]> {
        try {
                        const { stdout } = await exec(
                prismaBinary,
                ['migrate', 'status', '--schema', PRISMA_SCHEMA_PATH, '--json'],
                { cwd: workspaceRoot, env },
        );
                return parsePending(stdout);
        } catch (error) {
                console.warn('[brAInwav][schema-guard] prisma migrate status failed', { error });
                return [];
        }
}

export async function prepareMigrationArtifacts(options: SchemaGuardOptions): Promise<SchemaGuardResult> {
        const pendingMigrations = await collectPendingMigrations(options);
        if (pendingMigrations.length === 0) {
                return { pendingMigrations: [] };
        }
        const { prismaBinary, workspaceRoot, connectionString, env, now = Date.now, exec = execFileAsync } = options;
        const timestamp = new Date(now()).toISOString().replace(/[:.]/g, '-');
        const artifactDir = join(workspaceRoot, ARTIFACT_DIR);
        await mkdir(artifactDir, { recursive: true });

        const forwardScriptPath = await generateDiffScript({
                prismaBinary,
                workspaceRoot,
                connectionString,
                env,
                exec,
                kind: 'forward',
                filePath: join(artifactDir, `forward-${timestamp}.sql`),
        });
        const rollbackScriptPath = await generateDiffScript({
                prismaBinary,
                workspaceRoot,
                connectionString,
                env,
                exec,
                kind: 'rollback',
                filePath: join(artifactDir, `rollback-${timestamp}.sql`),
        });

        if (forwardScriptPath) {
                console.info('[brAInwav][schema-guard] generated forward migration script', {
                        path: forwardScriptPath,
                        pendingMigrations,
                });
        }
        if (rollbackScriptPath) {
                console.info('[brAInwav][schema-guard] generated rollback migration script', {
                        path: rollbackScriptPath,
                        pendingMigrations,
                });
        }

        return { pendingMigrations, forwardScriptPath, rollbackScriptPath };
}

function parsePending(stdout: string): string[] {
        try {
                const parsed = JSON.parse(stdout || '{}') as
                        | { unappliedMigrationNames?: string[]; migrations?: Array<{ applied?: boolean; name?: string }> }
                        | undefined;
                if (parsed?.unappliedMigrationNames && Array.isArray(parsed.unappliedMigrationNames)) {
                        return parsed.unappliedMigrationNames.filter((name): name is string => typeof name === 'string');
                }
                if (Array.isArray(parsed?.migrations)) {
                        return parsed!.migrations
                                .filter((migration) => migration && migration.applied === false)
                                .map((migration) => migration.name)
                                .filter((name): name is string => typeof name === 'string');
                }
        } catch {
                // ignore parse failures
        }
        return [];
}

interface DiffOptions {
        prismaBinary: string;
        workspaceRoot: string;
        connectionString: string;
        env: NodeJS.ProcessEnv;
        exec: typeof execFileAsync;
        kind: 'forward' | 'rollback';
        filePath: string;
}

async function generateDiffScript({
        prismaBinary,
        workspaceRoot,
        connectionString,
        env,
        exec,
        kind,
        filePath,
}: DiffOptions): Promise<string | undefined> {
        const args =
                kind === 'forward'
                        ? [
                                  'migrate',
                                  'diff',
                                  '--from-url',
                                  connectionString,
                                  '--to-schema-datamodel',
                                  PRISMA_SCHEMA_PATH,
                                  '--script',
                          ]
                        : [
                                  'migrate',
                                  'diff',
                                  '--from-schema-datamodel',
                                  PRISMA_SCHEMA_PATH,
                                  '--to-url',
                                  connectionString,
                                  '--script',
                          ];
        try {
                const { stdout } = await exec(prismaBinary, args, {
                        cwd: workspaceRoot,
                        env: { ...env, DATABASE_URL: connectionString },
                });
                const trimmed = stdout.trim();
                if (!trimmed) return undefined;
                await writeFile(filePath, trimmed);
                return filePath;
        } catch (error) {
                console.warn('[brAInwav][schema-guard] prisma migrate diff failed', { error, kind });
                return undefined;
        }
}
