export async function saveCheckpoint(threadId: string, state: unknown) {
  // save state to persistent store
  console.error('Checkpoint saved for thread:', threadId);
}
export async function loadCheckpoint(threadId: string) {
  // load state from persistent store
  return {};
}
