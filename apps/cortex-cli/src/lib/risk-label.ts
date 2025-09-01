const RISK_LABELS = {
  low: '[LOW]',
  medium: '[MEDIUM]',
  high: '[HIGH]',
} as const;

export function getRiskLabel(riskLevel: 'low' | 'medium' | 'high'): string {
  return RISK_LABELS[riskLevel] ?? RISK_LABELS.medium;
}

