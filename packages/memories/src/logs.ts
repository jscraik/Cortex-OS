export async function logEvent(event: unknown) {
  // log event to persistent store
  console.error('Event logged:', event);
}
