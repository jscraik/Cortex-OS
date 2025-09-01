const RISK_LABELS = {
  low: '[LOW]',
  medium: '[MEDIUM]',
  high: '[HIGH]',
} as const;

  return RISK_LABELS[riskLevel];
}

