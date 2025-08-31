export function redactPII(text: string): string {
  // Replace email addresses with placeholder
  let result = text.replace(/\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/g, '[REDACTED]');

  // Replace phone numbers (various formats) - more specific patterns
  result = result.replace(/\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/g, '[REDACTED]'); // (555) 123-4567
  result = result.replace(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/g, '[REDACTED]'); // 555-123-4567
  result = result.replace(/\+\d{1,3}[-.\s]\d{3}[-.\s]\d{3}[-.\s]\d{4}/g, '[REDACTED]'); // +1-555-123-4567

  // Replace credit card numbers (simple pattern) - with word boundaries
  result = result.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED]');

  // Replace SSN patterns - with word boundaries
  result = result.replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[REDACTED]');

  // Replace basic address patterns (number + street name)
  result = result.replace(
    /\b\d+\s+[a-z]+\s+(?:st(?:reet)?|ave(?:nue)?|rd|road|blvd|boulevard|ln|lane|dr(?:ive)?|way)\b/gi,
    '[REDACTED]',
  );

  return result;
}
