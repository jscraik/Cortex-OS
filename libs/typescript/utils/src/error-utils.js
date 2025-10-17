export function safeErrorMessage(err) {
    if (err instanceof Error)
        return err.message;
    if (typeof err === 'string')
        return err;
    try {
        return JSON.stringify(err);
    }
    catch {
        return 'Unknown error';
    }
}
export function safeErrorStack(err) {
    return err instanceof Error ? err.stack : undefined;
}
