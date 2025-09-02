import { z } from "zod";

export const compliancePolicySchema = z.object({
	exceptions: z.object({
		devOnly: z.array(z.string()),
	}),
});

export type CompliancePolicy = z.infer<typeof compliancePolicySchema>;
