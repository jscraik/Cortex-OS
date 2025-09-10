function luhnCheck(card: string): boolean {
	const digits = card.replace(/[\s-]/g, '');
	let sum = 0;
	let alt = false;
	for (let i = digits.length - 1; i >= 0; i--) {
		let n = Number(digits[i]);
		if (alt) {
			n *= 2;
			if (n > 9) n -= 9;
		}
		sum += n;
		alt = !alt;
	}
	return sum % 10 === 0;
}

export function redactPII(text: string): string {
	// Replace email addresses with placeholder
	let result = text.replace(
		/\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/g,
		'[REDACTED]',
	);

	// Replace credit card numbers using Luhn check
	const ccPattern = /\b(?:\d[ -]?){13,19}\b/g;
	result = result.replace(ccPattern, (m) => (luhnCheck(m) ? '[REDACTED]' : m));

	// Replace international phone numbers; require at least 7 digits to avoid false positives
	const phonePattern =
		/(?<!\d)(\+\d{1,3}[-.\s]?)?(?:\(?\d{1,4}\)?[-.\s]?){2,4}\d{3,4}(?!\d)/g;
	result = result.replace(phonePattern, (_m, cc) => {
		if (_m.replace(/[^\d]/g, '').length < 7) return _m;
		return cc ? `${cc}[REDACTED]` : '[REDACTED]';
	});

	// Replace SSN patterns - with word boundaries

	result = result.replace(/\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g, '[REDACTED]');

	// Replace basic address patterns (number + street name)
	result = result.replace(
		/\b\d+\s+[A-Za-z]+\s+(?:st(?:reet)?|ave(?:nue)?|rd|road|blvd|boulevard|ln|lane|dr(?:ive)?|way)\b/gi,
		'[REDACTED]',
	);

	return result;
}
