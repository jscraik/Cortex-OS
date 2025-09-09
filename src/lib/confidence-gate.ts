export function gateByConfidence(
  confidence: number,
  threshold: number
): 'ok' | 'needs escalation' {
  return confidence < threshold ? 'needs escalation' : 'ok';
}
