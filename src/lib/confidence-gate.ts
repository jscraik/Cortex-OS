export function gateByConfidence(
	confidence: number,
	threshold: number,
): 'ok' | 'needs escalation' {
	if (
		typeof confidence !== 'number' ||
		typeof threshold !== 'number' ||
		Number.isNaN(confidence) ||
		Number.isNaN(threshold) ||
		confidence < 0 ||
		confidence > 1 ||
		threshold < 0 ||
		threshold > 1
	) {
		throw new RangeError(
			'Both confidence and threshold must be numbers between 0 and 1 (inclusive).',
		);
	}
	return confidence < threshold ? 'needs escalation' : 'ok';
}
