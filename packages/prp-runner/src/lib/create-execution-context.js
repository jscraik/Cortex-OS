export function createExecutionContext(llmBridge) {
    return {
        workingDirectory: process.cwd(),
        projectRoot: process.cwd(),
        outputDirectory: "./dist",
        tempDirectory: "./tmp",
        environmentVariables: process.env,
        timeout: 30000,
        llmBridge,
    };
}
//# sourceMappingURL=create-execution-context.js.map