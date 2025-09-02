import { describe, expect, it } from "vitest";
import { redactPII } from "../src/privacy/redact.js";

describe("Enhanced privacy redaction", () => {
	it("redacts various types of PII from text", () => {
		// Test email redaction (existing functionality)
		expect(redactPII("Contact me at test@example.com")).toBe(
			"Contact me at [REDACTED]",
		);

		// Test phone number redaction (new functionality)
		expect(redactPII("Call me at 555-123-4567")).toBe("Call me at [REDACTED]");

		expect(redactPII("My number is (555) 123-4567")).toBe(
			"My number is [REDACTED]",
		);

		expect(redactPII("Reach out at +1-555-123-4567")).toBe(
			"Reach out at +1-[REDACTED]",
		);

		// Test credit card redaction (new functionality)
		expect(redactPII("My card is 4111-1111-1111-1111")).toBe(
			"My card is [REDACTED]",
		);

		expect(redactPII("Card: 4111111111111111")).toBe("Card: [REDACTED]");

		// Test SSN redaction (new functionality)
		expect(redactPII("SSN: 123-45-6789")).toBe("SSN: [REDACTED]");

		// Test address redaction (new functionality)
		expect(redactPII("I live at 123 Main St")).toBe("I live at [REDACTED]");
	});

	it("handles complex text with multiple PII types", () => {
		const input = `
      Contact Information:
      Email: john.doe@example.com
      Phone: (555) 123-4567
      Credit Card: 4111-1111-1111-1111
      SSN: 123-45-6789
      Address: 123 Main St
    `;

		const expected = `
      Contact Information:
      Email: [REDACTED]
      Phone: [REDACTED]
      Credit Card: [REDACTED]
      SSN: [REDACTED]
      Address: [REDACTED]
    `;

		expect(redactPII(input)).toBe(expected);
	});

	it("does not over-redact normal text", () => {
		const input = "This is a normal message without PII.";
		expect(redactPII(input)).toBe(input);

		// Numbers that aren't PII shouldn't be redacted
		const input2 = "The price is $12.99 for 2 items.";
		expect(redactPII(input2)).toBe(input2);

		// Dates shouldn't be redacted
		const input3 = "The meeting is on 2023-12-25.";
		expect(redactPII(input3)).toBe(input3);
	});

	it("handles edge cases correctly", () => {
		// Empty string
		expect(redactPII("")).toBe("");

		// String with only spaces
		expect(redactPII("   ")).toBe("   ");

		// Partial matches shouldn't be redacted
		expect(redactPII("test@")).toBe("test@");
		expect(redactPII("555-123")).toBe("555-123");
	});
});
