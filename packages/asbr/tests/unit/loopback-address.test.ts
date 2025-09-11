import { describe, expect, it } from 'vitest';
import { isLoopbackAddress } from '../../src/api/auth.js';

// Test constants to avoid hardcoded IPs
const TEST_LOOPBACK_IP = '127.0.0.1';
const TEST_LOOPBACK_IP_ALT = '127.10.20.30';
const TEST_NON_LOOPBACK_IP = '203.0.113.1'; // RFC 5737 test IP
const TEST_LOOPBACK_IPV6 = '::1';
// IPv4-mapped IPv6 loopback address - safe for testing loopback detection
// eslint-disable-next-line sonarjs/no-hardcoded-ip
const TEST_LOOPBACK_IPV6_ALT = '::ffff:127.0.0.1';
const TEST_NON_LOOPBACK_IPV6 = '2001:db8::1';

describe('isLoopbackAddress', () => {
	it('detects IPv4 loopback addresses', () => {
		expect(isLoopbackAddress(TEST_LOOPBACK_IP)).toBe(true);
		expect(isLoopbackAddress(TEST_LOOPBACK_IP_ALT)).toBe(true);
		expect(isLoopbackAddress(TEST_NON_LOOPBACK_IP)).toBe(false);
	});

	it('detects IPv6 loopback addresses', () => {
		expect(isLoopbackAddress(TEST_LOOPBACK_IPV6)).toBe(true);
		expect(isLoopbackAddress(TEST_LOOPBACK_IPV6_ALT)).toBe(true);
		expect(isLoopbackAddress(TEST_NON_LOOPBACK_IPV6)).toBe(false);
	});
});
