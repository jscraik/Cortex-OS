import { z } from 'zod';
export declare const ThermalLevelSchema: z.ZodEnum<['nominal', 'warning', 'critical']>;
export type ThermalLevel = z.infer<typeof ThermalLevelSchema>;
export declare const ThermalEventSchema: z.ZodObject<
	{
		deviceId: z.ZodString;
		temperature: z.ZodNumber;
		threshold: z.ZodNumber;
		level: z.ZodEnum<['nominal', 'warning', 'critical']>;
		throttleHint: z.ZodOptional<z.ZodString>;
		source: z.ZodString;
		timestamp: z.ZodString;
		message: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		message: string;
		source: string;
		temperature: number;
		level: 'warning' | 'nominal' | 'critical';
		deviceId: string;
		timestamp: string;
		threshold: number;
		throttleHint?: string | undefined;
	},
	{
		message: string;
		source: string;
		temperature: number;
		level: 'warning' | 'nominal' | 'critical';
		deviceId: string;
		timestamp: string;
		threshold: number;
		throttleHint?: string | undefined;
	}
>;
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
export declare class ThermalPolicy {
	private readonly config;
	constructor(config?: Partial<ThermalPolicyConfig>);
	evaluate(eventInput: ThermalEvent, now?: number): ThermalDecision;
	classify(temperature: number): ThermalLevel;
	defaultThrottleHint(level: ThermalLevel): string | undefined;
}
//# sourceMappingURL=thermal-policy.d.ts.map
