import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
        CodeModeDispatcher,
        CodeModeThermalError,
        CodeModeRuntimeUnavailableError,
        recordCodeModeBenchmark,
        type CodeModeAction,
        type CodeModeContext,
        type CodeModeRuntime,
} from '../src/index.js';
import { createInitialN0State } from '../src/langgraph/n0-state.js';

describe('CodeModeDispatcher', () => {
        let dispatcher: CodeModeDispatcher;
        let ctx: CodeModeContext;
        const tracer = vi.fn();
        const benchmarks: string[] = [];

        beforeEach(() => {
                dispatcher = new CodeModeDispatcher();
                ctx = {
                        sessionId: 'session-1',
                        tracer,
                        recordBenchmark: (result) => {
                                benchmarks.push(JSON.stringify(result));
                        },
                };
                tracer.mockReset();
                benchmarks.length = 0;
        });

        it('executes actions across runtimes and records telemetry', async () => {
                dispatcher.registerRuntime(createRuntime('typescript'));
                dispatcher.registerRuntime(createRuntime('python'));

                const state = createInitialN0State('input', {
                        id: 'session-1',
                        model: 'brainwav',
                        user: 'tester',
                        cwd: '/tmp',
                });

                const actions: CodeModeAction[] = [
                        { id: 'a1', language: 'typescript', tool: 'filesystem.read', payload: { path: '/tmp' } },
                        { id: 'a2', language: 'python', tool: 'metrics.record', payload: { value: 1 } },
                ];

                const next = await dispatcher.dispatch(state, actions, ctx);

                expect(next.ctx?.codeMode).toBeDefined();
                expect(benchmarks).toHaveLength(2);
                expect(tracer).toHaveBeenCalledWith('code-mode.runtime.success', expect.any(Object));
                expect(tracer).toHaveBeenCalledWith(
                        'code-mode.benchmark.recorded',
                        expect.objectContaining({ language: 'typescript' }),
                );
        });

        it('falls back when thermal errors occur', async () => {
                const hotRuntime: CodeModeRuntime = {
                        language: 'typescript',
                        execute: async () => {
                                throw new CodeModeThermalError('overheat');
                        },
                };
                dispatcher.registerRuntime(hotRuntime);
                dispatcher.registerRuntime(createRuntime('python'));

                const state = createInitialN0State('input', {
                        id: 'session-1',
                        model: 'brainwav',
                        user: 'tester',
                        cwd: '/tmp',
                });

                const actions: CodeModeAction[] = [
                        { id: 'a1', language: 'typescript', tool: 'filesystem.read', payload: {}, fallbacks: ['python'] },
                ];

                const next = await dispatcher.dispatch(state, actions, ctx);
                const completed = (next.ctx?.codeMode as { completed: Array<{ language: string }> }).completed;
                expect(completed[0].language).toBe('python');
                expect(tracer).toHaveBeenCalledWith(
                        'code-mode.benchmark.recorded',
                        expect.objectContaining({ language: 'python' }),
                );
        });

        it('records successes before surfacing non-thermal failure', async () => {
                dispatcher.registerRuntime(createRuntime('typescript'));
                dispatcher.registerRuntime({
                        language: 'python',
                        execute: async () => {
                                throw new Error('runtime exploded');
                        },
                });

                const state = createInitialN0State('input', {
                        id: 'session-1',
                        model: 'brainwav',
                        user: 'tester',
                        cwd: '/tmp',
                });

                const actions: CodeModeAction[] = [
                        { id: 'a1', language: 'typescript', tool: 'filesystem.read', payload: { path: '/tmp' } },
                        { id: 'a2', language: 'python', tool: 'metrics.record', payload: { value: 2 } },
                ];

                await expect(dispatcher.dispatch(state, actions, ctx)).rejects.toThrow('runtime exploded');

                expect(benchmarks).toHaveLength(1);
                expect(JSON.parse(benchmarks[0]).language).toBe('typescript');
                expect(tracer).toHaveBeenCalledWith(
                        'code-mode.runtime.failure',
                        expect.objectContaining({ language: 'python' }),
                );
        });

        it('continues when benchmark hook rejects', async () => {
                dispatcher.registerRuntime(createRuntime('typescript'));

                const state = createInitialN0State('input', {
                        id: 'session-1',
                        model: 'brainwav',
                        user: 'tester',
                        cwd: '/tmp',
                });

                const failingHook = vi.fn(async () => {
                        throw new Error('disk full');
                });
                ctx.recordBenchmark = failingHook;

                const actions: CodeModeAction[] = [
                        { id: 'a1', language: 'typescript', tool: 'filesystem.read', payload: { path: '/tmp' } },
                ];

                const next = await dispatcher.dispatch(state, actions, ctx);

                expect(next.ctx?.codeMode).toBeDefined();
                expect(failingHook).toHaveBeenCalledTimes(1);
                expect(tracer).toHaveBeenCalledWith(
                        'code-mode.benchmark.failure',
                        expect.objectContaining({ language: 'typescript', tool: 'filesystem.read' }),
                );
                expect(benchmarks).toHaveLength(0);
        });

        it('raises when no runtime is available', async () => {
                const state = createInitialN0State('input', {
                        id: 'session-1',
                        model: 'brainwav',
                        user: 'tester',
                        cwd: '/tmp',
                });

                const actions: CodeModeAction[] = [
                        { id: 'a1', language: 'rust', tool: 'compile', payload: {} },
                ];

                await expect(dispatcher.dispatch(state, actions, ctx)).rejects.toBeInstanceOf(
                        CodeModeRuntimeUnavailableError,
                );
        });
});

describe('recordCodeModeBenchmark', () => {
        it('writes structured records with brAInwav branding', async () => {
                const writes: string[] = [];
                await recordCodeModeBenchmark(
                        {
                                write: async (content) => {
                                        writes.push(content);
                                },
                        },
                        {
                                language: 'typescript',
                                tool: 'filesystem.read',
                                durationMs: 12,
                                output: 'ok',
                        },
                );

                expect(writes[0]).toContain('"brand":"brAInwav"');
        });
});

function createRuntime(language: CodeModeRuntime['language']): CodeModeRuntime {
        return {
                language,
                execute: async (action) => ({
                        language,
                        tool: action.tool,
                        durationMs: 5,
                        output: { status: 'ok' },
                }),
        };
}
