/**
 * @file a11y-utils.test.ts
 * @description Comprehensive test suite for A11yUtils (WCAG 2.2 AA/AAA Compliance)
 * @author Cortex-OS Team
 * @version 1.0.0
 *
 * Context: Frontend (Accessibility)
 * Framework: Vitest + jsdom
 * Coverage Target: 100%
 * Specification: WCAG 2.2 AA/AAA compliance, color contrast, keyboard navigation, ARIA
 */

// Setup DOM environment
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { A11yUtils } from './index';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
	url: 'http://localhost',
	pretendToBeVisual: true,
	resources: 'usable',
});

global.document = dom.window.document;
global.window = dom.window as unknown;
global.HTMLElement = dom.window.HTMLElement;

describe('A11yUtils - WCAG 2.2 AA/AAA Compliance Suite', () => {
	describe('Color Contrast Calculations', () => {
		describe('getContrastRatio', () => {
			it('should calculate correct contrast ratio for black and white', () => {
				const ratio = A11yUtils.getContrastRatio('#000000', '#FFFFFF');
				expect(ratio).toBeCloseTo(21.0, 1); // Perfect contrast
			});

			it('should calculate correct contrast ratio for same colors', () => {
				const ratio = A11yUtils.getContrastRatio('#FF5733', '#FF5733');
				expect(ratio).toBeCloseTo(1.0, 2); // Same color = 1:1 ratio
			});

			it('should handle colors without # prefix', () => {
				const ratio1 = A11yUtils.getContrastRatio('000000', 'FFFFFF');
				const ratio2 = A11yUtils.getContrastRatio('#000000', '#FFFFFF');
				expect(ratio1).toBeCloseTo(ratio2, 2);
			});

			it('should calculate ratio for common accessible color pairs', () => {
				// Test cases from WebAIM contrast checker
				const testCases = [
					{
						fg: '#333333',
						bg: '#FFFFFF',
						expectedMin: 12.6,
						expectedMax: 12.7,
					}, // Dark gray on white
					{ fg: '#767676', bg: '#FFFFFF', expectedMin: 4.5, expectedMax: 4.6 }, // Medium gray on white (AA threshold)
					{ fg: '#0066CC', bg: '#FFFFFF', expectedMin: 7.2, expectedMax: 7.3 }, // Blue on white
					{ fg: '#FFFFFF', bg: '#0066CC', expectedMin: 7.2, expectedMax: 7.3 }, // White on blue (reverse)
				];

				testCases.forEach(({ fg, bg, expectedMin, expectedMax }) => {
					const ratio = A11yUtils.getContrastRatio(fg, bg);
					expect(ratio).toBeGreaterThanOrEqual(expectedMin);
					expect(ratio).toBeLessThanOrEqual(expectedMax);
				});
			});

			it('should handle 3-digit hex colors', () => {
				// #ABC should expand to #AABBCC
				expect(() => {
					A11yUtils.getContrastRatio('#FFF', '#000');
				}).not.toThrow();

				const ratio = A11yUtils.getContrastRatio('#FFF', '#000');
				expect(ratio).toBeCloseTo(21.0, 1);
			});

			it('should handle lowercase hex colors', () => {
				const ratio1 = A11yUtils.getContrastRatio('#ffffff', '#000000');
				const ratio2 = A11yUtils.getContrastRatio('#FFFFFF', '#000000');
				expect(ratio1).toBeCloseTo(ratio2, 5);
			});

			it('should handle edge case colors', () => {
				// Very dark but not black
				const darkRatio = A11yUtils.getContrastRatio('#010101', '#FFFFFF');
				expect(darkRatio).toBeLessThan(21.0);
				expect(darkRatio).toBeGreaterThan(20.0);

				// Very light but not white
				const lightRatio = A11yUtils.getContrastRatio('#000000', '#FEFEFE');
				expect(lightRatio).toBeLessThan(21.0);
				expect(lightRatio).toBeGreaterThan(20.0);
			});
		});

		describe('WCAG 2.2 AA Compliance (meetsAaContrast)', () => {
			it('should pass AA compliance for high contrast pairs', () => {
				expect(A11yUtils.meetsAaContrast('#000000', '#FFFFFF')).toBe(true); // 21:1
				expect(A11yUtils.meetsAaContrast('#333333', '#FFFFFF')).toBe(true); // ~12.6:1
				expect(A11yUtils.meetsAaContrast('#0066CC', '#FFFFFF')).toBe(true); // ~7.3:1
			});

			it('should fail AA compliance for low contrast pairs', () => {
				expect(A11yUtils.meetsAaContrast('#CCCCCC', '#FFFFFF')).toBe(false); // ~1.6:1
				expect(A11yUtils.meetsAaContrast('#999999', '#FFFFFF')).toBe(false); // ~2.8:1
				expect(A11yUtils.meetsAaContrast('#777777', '#FFFFFF')).toBe(false); // ~4.5:1 - exactly at boundary
			});

			it('should handle boundary case exactly at 4.5:1', () => {
				// Colors that produce exactly 4.5:1 ratio should pass
				const ratio = A11yUtils.getContrastRatio('#767676', '#FFFFFF');
				expect(ratio).toBeGreaterThanOrEqual(4.5);
				expect(A11yUtils.meetsAaContrast('#767676', '#FFFFFF')).toBe(true);
			});

			it('should work regardless of foreground/background order', () => {
				expect(A11yUtils.meetsAaContrast('#000000', '#FFFFFF')).toBe(true);
				expect(A11yUtils.meetsAaContrast('#FFFFFF', '#000000')).toBe(true);
			});

			it('should validate real-world color schemes', () => {
				// Common accessible color combinations
				const accessiblePairs = [
					['#1F2937', '#F9FAFB'], // Tailwind gray-800 on gray-50
					['#1E40AF', '#FFFFFF'], // Tailwind blue-800 on white
					['#DC2626', '#FFFFFF'], // Tailwind red-600 on white
					['#059669', '#FFFFFF'], // Tailwind green-600 on white
				];

				accessiblePairs.forEach(([fg, bg]) => {
					expect(A11yUtils.meetsAaContrast(fg, bg)).toBe(true);
				});
			});
		});

		describe('WCAG 2.2 AAA Compliance (meetsAaaContrast)', () => {
			it('should pass AAA compliance for very high contrast pairs', () => {
				expect(A11yUtils.meetsAaaContrast('#000000', '#FFFFFF')).toBe(true); // 21:1
				expect(A11yUtils.meetsAaaContrast('#333333', '#FFFFFF')).toBe(true); // ~12.6:1
			});

			it('should fail AAA compliance for medium contrast pairs', () => {
				expect(A11yUtils.meetsAaaContrast('#0066CC', '#FFFFFF')).toBe(true); // ~7.3:1 (passes)
				expect(A11yUtils.meetsAaaContrast('#767676', '#FFFFFF')).toBe(false); // ~4.5:1 (fails)
				expect(A11yUtils.meetsAaaContrast('#555555', '#FFFFFF')).toBe(false); // ~6.7:1 (fails)
			});

			it('should handle boundary case exactly at 7.0:1', () => {
				// Find a color that produces exactly 7.0:1 ratio
				const ratio = A11yUtils.getContrastRatio('#595959', '#FFFFFF');
				expect(ratio).toBeGreaterThanOrEqual(7.0);
				expect(A11yUtils.meetsAaaContrast('#595959', '#FFFFFF')).toBe(true);
			});

			it('should be more restrictive than AA', () => {
				// Colors that pass AA but fail AAA
				const mediumContrastColor = '#767676'; // ~4.5:1 with white

				expect(A11yUtils.meetsAaContrast(mediumContrastColor, '#FFFFFF')).toBe(true);
				expect(A11yUtils.meetsAaaContrast(mediumContrastColor, '#FFFFFF')).toBe(false);
			});
		});

		describe('Hex to RGB Conversion', () => {
			// Testing private method through public interface
			it('should correctly convert basic hex colors', () => {
				// We can infer RGB conversion is working if contrast ratios are correct
				const whiteBlackRatio = A11yUtils.getContrastRatio('#FFFFFF', '#000000');
				const redGreenRatio = A11yUtils.getContrastRatio('#FF0000', '#00FF00');

				expect(whiteBlackRatio).toBeCloseTo(21.0, 1);
				expect(redGreenRatio).toBeCloseTo(1.0, 0); // Red and green have similar luminance
			});

			it('should handle malformed hex colors gracefully', () => {
				expect(() => {
					A11yUtils.getContrastRatio('invalid', '#FFFFFF');
				}).not.toThrow(); // Should not crash, may return NaN or default
			});
		});

		describe('Relative Luminance Calculations', () => {
			it('should calculate correct luminance values', () => {
				// Pure white should have luminance ~1, pure black ~0
				const whiteRatio = A11yUtils.getContrastRatio('#FFFFFF', '#FFFFFF');
				const blackRatio = A11yUtils.getContrastRatio('#000000', '#000000');

				expect(whiteRatio).toBeCloseTo(1.0, 5);
				expect(blackRatio).toBeCloseTo(1.0, 5);
			});

			it('should handle gamma correction properly', () => {
				// Colors with different gamma correction scenarios
				const lowGamma = A11yUtils.getContrastRatio('#101010', '#FFFFFF'); // Should use linear division
				const highGamma = A11yUtils.getContrastRatio('#808080', '#FFFFFF'); // Should use power function

				expect(lowGamma).toBeGreaterThan(highGamma);
				expect(lowGamma).toBeGreaterThan(1);
				expect(highGamma).toBeGreaterThan(1);
			});
		});
	});

	describe('Screen Reader Support', () => {
		describe('generateSrText', () => {
			it('should return text without context when none provided', () => {
				const result = A11yUtils.generateSrText('Close');
				expect(result).toBe('Close');
			});

			it('should append context when provided', () => {
				const result = A11yUtils.generateSrText('Close', 'Close dialog');
				expect(result).toBe('Close (Close dialog)');
			});

			it('should handle empty text', () => {
				const result = A11yUtils.generateSrText('', 'Empty text');
				expect(result).toBe(' (Empty text)');
			});

			it('should handle special characters', () => {
				const result = A11yUtils.generateSrText('Submit & Save', 'Contact form submission');
				expect(result).toBe('Submit & Save (Contact form submission)');
			});

			it('should handle unicode characters', () => {
				const result = A11yUtils.generateSrText('Close ✕', 'Close modal dialog');
				expect(result).toBe('Close ✕ (Close modal dialog)');
			});

			it('should handle long text content', () => {
				const longText = 'This is a very long piece of text that might be used for screen readers';
				const context = 'Detailed description for accessibility';
				const result = A11yUtils.generateSrText(longText, context);
				expect(result).toBe(`${longText} (${context})`);
			});
		});
	});

	describe('ARIA Label Generation', () => {
		describe('generateAriaLabel', () => {
			it('should generate basic ARIA labels', () => {
				const result = A11yUtils.generateAriaLabel('button', 'Submit');
				expect(result).toBe('Submit button');
			});

			it('should include context when provided', () => {
				const result = A11yUtils.generateAriaLabel('button', 'Submit', 'Contact form');
				expect(result).toBe('Submit button Contact form');
			});

			it('should handle various element types', () => {
				const testCases = [
					{
						element: 'button',
						action: 'Click',
						context: 'to open menu',
						expected: 'Click button to open menu',
					},
					{
						element: 'link',
						action: 'Navigate',
						context: 'to homepage',
						expected: 'Navigate link to homepage',
					},
					{
						element: 'checkbox',
						action: 'Toggle',
						context: 'newsletter subscription',
						expected: 'Toggle checkbox newsletter subscription',
					},
					{
						element: 'textbox',
						action: 'Enter',
						context: 'your email address',
						expected: 'Enter textbox your email address',
					},
				];

				testCases.forEach(({ element, action, context, expected }) => {
					const result = A11yUtils.generateAriaLabel(element, action, context);
					expect(result).toBe(expected);
				});
			});

			it('should handle empty or undefined values', () => {
				expect(A11yUtils.generateAriaLabel('', 'Submit')).toBe('Submit ');
				expect(A11yUtils.generateAriaLabel('button', '')).toBe(' button');
				expect(A11yUtils.generateAriaLabel('button', 'Submit', '')).toBe('Submit button ');
			});

			it('should preserve case and formatting', () => {
				const result = A11yUtils.generateAriaLabel('Button', 'SUBMIT', 'Contact Form');
				expect(result).toBe('SUBMIT Button Contact Form');
			});
		});
	});

	describe('Keyboard Navigation', () => {
		let mockItems: HTMLElement[];
		let mockOnSelect: unknown;
		let keyboardHandler: (event: KeyboardEvent) => void;

		beforeEach(() => {
			// Create mock DOM elements
			mockItems = [];
			for (let i = 0; i < 5; i++) {
				const element = document.createElement('div');
				element.setAttribute('tabindex', '0');
				element.id = `item-${i}`;
				element.focus = vi.fn();
				mockItems.push(element);
				document.body.appendChild(element);
			}

			mockOnSelect = vi.fn();
			keyboardHandler = A11yUtils.createKeyboardNavHandler(mockItems, mockOnSelect);
		});

		afterEach(() => {
			document.body.innerHTML = '';
			vi.clearAllMocks();
		});

		describe('createKeyboardNavHandler', () => {
			it('should handle ArrowDown navigation', () => {
				const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
				const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

				keyboardHandler(event);

				expect(preventDefaultSpy).toHaveBeenCalled();
				expect(mockItems[1].focus).toHaveBeenCalled();
			});

			it('should handle ArrowUp navigation', () => {
				const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
				const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

				keyboardHandler(event);

				expect(preventDefaultSpy).toHaveBeenCalled();
				expect(mockItems[4].focus).toHaveBeenCalled(); // Should wrap to last item
			});

			it('should handle Enter key selection', () => {
				const event = new KeyboardEvent('keydown', { key: 'Enter' });
				const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

				keyboardHandler(event);

				expect(preventDefaultSpy).toHaveBeenCalled();
				expect(mockOnSelect).toHaveBeenCalledWith(mockItems[0], 0);
			});

			it('should handle Escape key', () => {
				// Set up active element
				const activeElement = document.createElement('button');
				activeElement.blur = vi.fn();
				Object.defineProperty(document, 'activeElement', {
					value: activeElement,
					writable: true,
				});

				const event = new KeyboardEvent('keydown', { key: 'Escape' });
				const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

				keyboardHandler(event);

				expect(preventDefaultSpy).toHaveBeenCalled();
				expect(activeElement.blur).toHaveBeenCalled();
			});

			it('should wrap around at boundaries', () => {
				// Navigate to last item
				for (let i = 0; i < 4; i++) {
					const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
					keyboardHandler(event);
				}

				// One more down should wrap to first
				const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
				keyboardHandler(event);

				expect(mockItems[0].focus).toHaveBeenCalled();
			});

			it('should handle rapid key presses', () => {
				const events = [
					new KeyboardEvent('keydown', { key: 'ArrowDown' }),
					new KeyboardEvent('keydown', { key: 'ArrowDown' }),
					new KeyboardEvent('keydown', { key: 'ArrowUp' }),
					new KeyboardEvent('keydown', { key: 'Enter' }),
				];

				for (const event of events) {
					keyboardHandler(event);
				}

				expect(mockOnSelect).toHaveBeenCalledWith(mockItems[1], 1); // Should be on second item
			});

			it('should ignore unhandled keys', () => {
				const event = new KeyboardEvent('keydown', { key: 'a' });
				const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

				keyboardHandler(event);

				expect(preventDefaultSpy).not.toHaveBeenCalled();
				expect(mockOnSelect).not.toHaveBeenCalled();
			});

			it('should handle single item list', () => {
				const singleItem = [mockItems[0]];
				const singleHandler = A11yUtils.createKeyboardNavHandler(singleItem, mockOnSelect);

				const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
				const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });

				singleHandler(downEvent);
				singleHandler(upEvent);

				// Should focus the same item for both directions
				expect(mockItems[0].focus).toHaveBeenCalledTimes(2);
			});

			it('should handle empty item list gracefully', () => {
				const emptyHandler = A11yUtils.createKeyboardNavHandler([], mockOnSelect);
				const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

				expect(() => {
					emptyHandler(event);
				}).not.toThrow();
			});

			it('should maintain current index state', () => {
				// Move down twice
				keyboardHandler(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
				keyboardHandler(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

				// Select current item
				keyboardHandler(new KeyboardEvent('keydown', { key: 'Enter' }));

				expect(mockOnSelect).toHaveBeenCalledWith(mockItems[2], 2);
			});
		});

		describe('Keyboard Navigation Edge Cases', () => {
			it('should handle complex keyboard sequences', () => {
				const sequence = [
					{ key: 'ArrowDown', expectedIndex: 1 },
					{ key: 'ArrowDown', expectedIndex: 2 },
					{ key: 'ArrowUp', expectedIndex: 1 },
					{ key: 'ArrowUp', expectedIndex: 0 },
					{ key: 'ArrowUp', expectedIndex: 4 }, // Wrap to end
					{ key: 'ArrowDown', expectedIndex: 0 }, // Wrap to start
				];

				sequence.forEach(({ key, expectedIndex }) => {
					keyboardHandler(new KeyboardEvent('keydown', { key }));
					expect(mockItems[expectedIndex].focus).toHaveBeenCalled();
				});
			});

			it('should handle modified key events', () => {
				const ctrlDownEvent = new KeyboardEvent('keydown', {
					key: 'ArrowDown',
					ctrlKey: true,
				});
				const preventDefaultSpy = vi.spyOn(ctrlDownEvent, 'preventDefault');

				keyboardHandler(ctrlDownEvent);

				// Should still handle the event regardless of modifiers
				expect(preventDefaultSpy).toHaveBeenCalled();
				expect(mockItems[1].focus).toHaveBeenCalled();
			});
		});
	});

	describe('Integration Tests', () => {
		it('should work together for complete accessibility workflow', () => {
			// Test a complete accessibility implementation scenario

			// 1. Validate color scheme
			const primaryColor = '#1E40AF';
			const backgroundColor = '#FFFFFF';
			expect(A11yUtils.meetsAaContrast(primaryColor, backgroundColor)).toBe(true);

			// 2. Generate ARIA labels
			const buttonLabel = A11yUtils.generateAriaLabel('button', 'Submit', 'contact form');
			expect(buttonLabel).toBe('Submit button contact form');

			// 3. Create screen reader text
			const srText = A11yUtils.generateSrText('✓ Saved', 'Form successfully submitted');
			expect(srText).toBe('✓ Saved (Form successfully submitted)');

			// 4. Set up keyboard navigation
			const items = [
				document.createElement('button'),
				document.createElement('input'),
				document.createElement('a'),
			];
			const onSelect = vi.fn();
			const handler = A11yUtils.createKeyboardNavHandler(items, onSelect);

			// Test navigation
			handler(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
			handler(new KeyboardEvent('keydown', { key: 'Enter' }));

			expect(onSelect).toHaveBeenCalledWith(items[1], 1);
		});

		it('should handle real-world form accessibility', () => {
			// Simulate a complete form with accessibility features
			const formColors = {
				text: '#1F2937',
				background: '#FFFFFF',
				error: '#DC2626',
				success: '#059669',
			};

			// Validate all color combinations meet AA standards
			Object.entries(formColors).forEach(([key, color]) => {
				if (key !== 'background') {
					expect(A11yUtils.meetsAaContrast(color, formColors.background)).toBe(true);
				}
			});

			// Generate appropriate ARIA labels
			const labels = {
				email: A11yUtils.generateAriaLabel('textbox', 'Enter', 'your email address'),
				password: A11yUtils.generateAriaLabel('textbox', 'Enter', 'your password'),
				submit: A11yUtils.generateAriaLabel('button', 'Submit', 'login form'),
			};

			expect(labels.email).toBe('Enter textbox your email address');
			expect(labels.password).toBe('Enter textbox your password');
			expect(labels.submit).toBe('Submit button login form');

			// Generate screen reader feedback
			const feedback = {
				error: A11yUtils.generateSrText('Invalid email', 'Please enter a valid email address'),
				success: A11yUtils.generateSrText('Login successful', 'Redirecting to dashboard'),
			};

			expect(feedback.error).toBe('Invalid email (Please enter a valid email address)');
			expect(feedback.success).toBe('Login successful (Redirecting to dashboard)');
		});

		it('should handle responsive design accessibility', () => {
			// Test accessibility considerations for different screen sizes
			const colorSchemes = [
				{ name: 'light', text: '#000000', bg: '#FFFFFF' },
				{ name: 'dark', text: '#FFFFFF', bg: '#000000' },
				{ name: 'high-contrast', text: '#000000', bg: '#FFFF00' },
			];

			colorSchemes.forEach((scheme) => {
				const ratio = A11yUtils.getContrastRatio(scheme.text, scheme.bg);
				expect(ratio).toBeGreaterThanOrEqual(4.5); // All should meet AA

				if (scheme.name === 'high-contrast') {
					expect(A11yUtils.meetsAaaContrast(scheme.text, scheme.bg)).toBe(true);
				}
			});
		});
	});

	describe('Performance Tests', () => {
		it('should handle large numbers of contrast calculations efficiently', () => {
			const colors = [
				'#FF0000',
				'#00FF00',
				'#0000FF',
				'#FFFF00',
				'#FF00FF',
				'#00FFFF',
				'#800000',
				'#008000',
				'#000080',
				'#808000',
				'#800080',
				'#008080',
				'#000000',
				'#FFFFFF',
				'#808080',
				'#C0C0C0',
				'#404040',
				'#202020',
			];

			const startTime = Date.now();

			// Calculate contrast ratios for all combinations (18 * 18 = 324 calculations)
			colors.forEach((color1) => {
				colors.forEach((color2) => {
					A11yUtils.getContrastRatio(color1, color2);
					A11yUtils.meetsAaContrast(color1, color2);
					A11yUtils.meetsAaaContrast(color1, color2);
				});
			});

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Should complete within reasonable time (adjust threshold as needed)
			expect(duration).toBeLessThan(100); // 100ms for 972 calculations
		});

		it('should handle rapid keyboard navigation efficiently', () => {
			const largeItemList = Array.from({ length: 100 }, (_, _i) => {
				const element = document.createElement('div');
				element.focus = vi.fn();
				return element;
			});

			const handler = A11yUtils.createKeyboardNavHandler(largeItemList, vi.fn());

			const startTime = Date.now();

			// Simulate rapid navigation through all items
			for (let i = 0; i < 100; i++) {
				handler(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			expect(duration).toBeLessThan(50); // Should be very fast
		});

		it('should handle large text processing efficiently', () => {
			const longText = 'A'.repeat(10000);
			const longContext = 'B'.repeat(5000);

			const startTime = Date.now();

			for (let i = 0; i < 100; i++) {
				A11yUtils.generateSrText(longText, longContext);
				A11yUtils.generateAriaLabel('button', longText, longContext);
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			expect(duration).toBeLessThan(100); // String operations should be fast
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle malformed color values gracefully', () => {
			const malformedColors = [
				'not-a-color',
				'#GGG',
				'#12345', // Wrong length
				'',
				null as unknown,
				undefined as unknown,
				'#GGGGGG', // Invalid hex characters
			];

			malformedColors.forEach((color) => {
				expect(() => {
					A11yUtils.getContrastRatio(color, '#FFFFFF');
				}).not.toThrow();
			});
		});

		it('should handle extreme values', () => {
			// Test with very similar colors
			const result1 = A11yUtils.getContrastRatio('#000000', '#000001');
			expect(result1).toBeCloseTo(1.0, 1);

			// Test with colors at RGB boundaries
			const result2 = A11yUtils.getContrastRatio('#FFFFFF', '#FEFEFE');
			expect(result2).toBeCloseTo(1.0, 1);
		});

		it('should handle null/undefined inputs for text functions', () => {
			expect(A11yUtils.generateSrText(null as unknown)).toBe(null as unknown);
			expect(A11yUtils.generateSrText(undefined as unknown)).toBe(undefined as unknown);

			expect(() => {
				A11yUtils.generateAriaLabel(null as unknown, 'action');
			}).not.toThrow();
		});

		it('should handle keyboard events with null elements', () => {
			const nullItems = [null as unknown, undefined as unknown];
			const handler = A11yUtils.createKeyboardNavHandler(nullItems, vi.fn());

			expect(() => {
				handler(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
			}).not.toThrow();
		});
	});
});
