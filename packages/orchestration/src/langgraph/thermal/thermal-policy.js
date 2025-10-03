import { z } from 'zod';
export const ThermalLevelSchema = z.enum(['nominal', 'warning', 'critical']);
export const ThermalEventSchema = z.object({
	deviceId: z.string().min(1),
	temperature: z.number(),
	threshold: z.number(),
	level: ThermalLevelSchema,
	throttleHint: z.string().optional(),
	source: z.string().min(1),
	timestamp: z.string().min(1),
	message: z.string().min(1),
});
const DEFAULT_CONFIG = {
	warningThreshold: 72,
	criticalThreshold: 84,
	cooldownMs: 15_000,
};
export class ThermalPolicy {
	config;
	constructor(config = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}
	evaluate(eventInput, now = Date.now()) {
		const event = ThermalEventSchema.parse(eventInput);
		const computedLevel = this.classify(event.temperature);
		const level = event.level ?? computedLevel;
		const shouldPause = level !== 'nominal';
		const reason = `brAInwav thermal ${level}`;
		const cooldownUntil = shouldPause ? now + this.config.cooldownMs : undefined;
		const throttleHint = event.throttleHint ?? this.defaultThrottleHint(level);
		return {
			level,
			shouldPause,
			throttleHint,
			cooldownUntil,
			reason,
			event: { ...event, level, throttleHint },
		};
	}
	classify(temperature) {
		if (temperature >= this.config.criticalThreshold) {
			return 'critical';
		}
		if (temperature >= this.config.warningThreshold) {
			return 'warning';
		}
		return 'nominal';
	}
	defaultThrottleHint(level) {
		if (level === 'critical') {
			return 'brAInwav:reduce-load';
		}
		if (level === 'warning') {
			return 'brAInwav:prepare-fallback';
		}
		return undefined;
	}
}
//# sourceMappingURL=thermal-policy.js.map
