export function redactPII(text: string): string {
  // Replace email addresses with placeholder
  return text.replace(/\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/g, '[REDACTED]');
}
