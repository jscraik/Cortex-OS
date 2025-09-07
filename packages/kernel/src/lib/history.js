export function createHistory() {
    return new Map();
}
export function addToHistory(history, runId, state) {
    const states = history.get(runId) || [];
    states.push(state);
    history.set(runId, states);
}
export function getExecutionHistory(history, runId) {
    return history.get(runId) || [];
}
//# sourceMappingURL=history.js.map