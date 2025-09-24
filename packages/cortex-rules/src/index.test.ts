import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { getCurrentTime, getFreshnessRule, renderRule } from './index.js';

// Mock the file system
vi.mock('fs');

describe('cortex-rules', () => {
	describe('renderRule', () => {
		it('should replace USER_TIMEZONE and TODAY placeholders', () => {
			const mockContent =
				"Very important: The user's timezone is {{USER_TIMEZONE}}. Today's date is {{TODAY}}.";
			vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

			const result = renderRule('/path/to/rule.md', {
				USER_TIMEZONE: 'America/New_York',
				TODAY: '2025-09-21',
			});

			expect(result).toBe(
				"Very important: The user's timezone is America/New_York. Today's date is 2025-09-21.",
			);
		});

		it('should return default rule when file cannot be read', () => {
			vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
				throw new Error('File not found');
			});

			const result = renderRule('/path/to/nonexistent/rule.md', {
				USER_TIMEZONE: 'America/New_York',
				TODAY: '2025-09-21',
			});

			expect(result).toContain(
				"Very important: The user's timezone is America/New_York. Today's date is 2025-09-21.",
			);
			expect(result).toContain('Treat dates before this as past and after this as future');
		});
	});

	describe('getFreshnessRule', () => {
		it('should return rendered rule with default values', () => {
			const mockContent =
				"Very important: The user's timezone is {{USER_TIMEZONE}}. Today's date is {{TODAY}}.";
			vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);
			vi.spyOn(fs, 'existsSync').mockReturnValue(true);

			const result = getFreshnessRule();

			// Check that the result contains the expected pattern
			expect(result).toContain("Very important: The user's timezone is");
			expect(result).toContain("Today's date is");
		});

		it('should return rendered rule with custom values', () => {
			const mockContent =
				"Very important: The user's timezone is {{USER_TIMEZONE}}. Today's date is {{TODAY}}.";
			vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);
			vi.spyOn(fs, 'existsSync').mockReturnValue(true);

			const result = getFreshnessRule({
				userTimezone: 'Europe/London',
				today: '2025-09-21',
			});

			expect(result).toBe(
				"Very important: The user's timezone is Europe/London. Today's date is 2025-09-21.",
			);
		});

		it('should return default rule when file cannot be found', () => {
			vi.spyOn(fs, 'existsSync').mockReturnValue(false);

			const result = getFreshnessRule({
				userTimezone: 'Europe/London',
				today: '2025-09-21',
			});

			expect(result).toContain(
				"Very important: The user's timezone is Europe/London. Today's date is 2025-09-21.",
			);
			expect(result).toContain('Treat dates before this as past and after this as future');
		});
	});

	describe('getCurrentTime', () => {
		it('should return current time information', () => {
			// Mock Date to ensure consistent results
			const mockDate = new Date('2025-09-21T18:19:30Z');
			vi.setSystemTime(mockDate);

			const result = getCurrentTime();

			// We can't predict the timezone, but we can check the structure
			expect(result).toHaveProperty('tz');
			expect(result).toHaveProperty('isoDate');
			expect(result).toHaveProperty('isoTime');
			expect(result).toHaveProperty('timestamp');
			expect(result.isoDate).toBe('2025-09-21');
			expect(result.isoTime).toBe('18:19:30');
			expect(result.timestamp).toBe(mockDate.getTime());
		});
	});
});
