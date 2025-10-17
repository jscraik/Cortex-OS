#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const filesToRestore = ['package.json', 'pnpm-lock.yaml'];

function run(command, args, label) {
        const result = spawnSync(command, args, {
                cwd: repoRoot,
                stdio: 'inherit',
                env: process.env,
        });

        if (result.error) {
                throw result.error;
        }

        if (result.status !== 0) {
                const context = label ? `${command} ${label}` : command;
                throw new Error(`${context} exited with code ${result.status}`);
        }
}

function restoreBackups(backups) {
        for (const [file, contents] of backups) {
                const absolute = resolve(repoRoot, file);
                writeFileSync(absolute, contents, 'utf8');
        }
}

function ensureFilesExist() {
        for (const file of filesToRestore) {
                if (!existsSync(resolve(repoRoot, file))) {
                        throw new Error(`Required file not found: ${file}`);
                }
        }
}

function buildDoctorArgs() {
        const target = process.env.CORTEX_DEP_DOCTOR_TARGET ?? 'minor';
        const installCommand = process.env.CORTEX_DEP_DOCTOR_INSTALL ?? 'pnpm install --ignore-scripts';
        const testCommand = process.env.CORTEX_DEP_DOCTOR_TEST ?? 'pnpm run lint:smart';
        const extraFilter = process.env.CORTEX_DEP_DOCTOR_FILTER;

        const args = [
                'dlx',
                'npm-check-updates',
                '--doctor',
                '-u',
                '--target',
                target,
                '--doctorInstall',
                installCommand,
                '--doctorTest',
                testCommand,
        ];

        if (extraFilter) {
                args.push('--filter');
                args.push(extraFilter);
        }

        return args;
}

function main() {
        ensureFilesExist();
        const backups = new Map();
        for (const file of filesToRestore) {
                const absolute = resolve(repoRoot, file);
                backups.set(file, readFileSync(absolute, 'utf8'));
        }

        console.log('== Dependency upgrade readiness check ==');
        console.log('Backing up package.json and pnpm-lock.yaml before running doctor mode…');

        try {
                const doctorArgs = buildDoctorArgs();
                console.log('Running npm-check-updates in doctor mode to evaluate upgrades…');
                run('pnpm', doctorArgs, 'npm-check-updates --doctor');
                console.log('\nDoctor run complete. Review the output above for incompatible upgrades.');
        } catch (error) {
                console.error('\nDependency doctor run failed:', error.message ?? error);
                process.exitCode = 1;
        } finally {
                console.log('\nRestoring original package manifests…');
                restoreBackups(backups);
                try {
                        run('pnpm', ['install', '--frozen-lockfile'], 'install --frozen-lockfile');
                } catch (installError) {
                        console.error('Failed to restore workspace dependencies:', installError.message ?? installError);
                        process.exitCode = 1;
                }
        }

        if (process.exitCode === 0 || process.exitCode === undefined) {
                console.log('\nDependency upgrade readiness check completed successfully.');
        }
}

main();
