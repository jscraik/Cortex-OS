export type RunPythonOptions = {
    cwd?: string;
    envOverrides?: Record<string, string>;
    python?: string;
    setModulePath?: string;
    input?: string | Buffer;
};
export declare function resolvePython(explicit?: string): string;
export declare function runPython(scriptPath: string, args?: string[], options?: RunPythonOptions): Promise<string>;
declare const _default: {
    resolvePython: typeof resolvePython;
    runPython: typeof runPython;
};
export default _default;
export declare function spawnPythonProcess(pythonArgs: string[], options?: RunPythonOptions): import("child_process").ChildProcessWithoutNullStreams;
//# sourceMappingURL=exec.d.ts.map