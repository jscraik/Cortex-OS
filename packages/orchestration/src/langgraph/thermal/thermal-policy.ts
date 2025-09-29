import { z } from 'zod';

export const ThermalLevelSchema = z.enum(['nominal', 'warning', 'critical']);
export type ThermalLevel = z.infer<typeof ThermalLevelSchema>;

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
export type ThermalEvent = z.infer<typeof ThermalEventSchema>;

export interface ThermalPolicyConfig {
	warningThreshold: number;
	criticalThreshold: number;
	cooldownMs: number;
}

export interface ThermalDecision {
	level: ThermalLevel;
	shouldPause: boolean;
	throttleHint?: string;
	cooldownUntil?: number;
	reason: string;
	event: ThermalEvent;
}

const DEFAULT_CONFIG: ThermalPolicyConfig = {
	warningThreshold: 72,
	criticalThreshold: 84,
	cooldownMs: 15_000,
};

export class ThermalPolicy {
	private readonly config: ThermalPolicyConfig;

	constructor(config: Partial<ThermalPolicyConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	evaluate(eventInput: ThermalEvent, now: number = Date.now()): ThermalDecision {
		const event = ThermalEventSchema.parse(eventInput);
		const computedLevel = this.classify(event.temperature);
		const level: ThermalLevel = event.level ?? computedLevel;

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

	classify(temperature: number): ThermalLevel {
		if (temperature >= this.config.criticalThreshold) {
			return 'critical';
		}
		if (temperature >= this.config.warningThreshold) {
			return 'warning';
		}
		return 'nominal';
	}

	defaultThrottleHint(level: ThermalLevel): string | undefined {
		if (level === 'critical') {
			return 'brAInwav:reduce-load';
		}
		if (level === 'warning') {
			return 'brAInwav:prepare-fallback';
		}
		return undefined;
	}
}
