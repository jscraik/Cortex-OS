import { z } from "zod";

const piiAction = z.object({
  type: z.enum(["mask", "drop"]),
  fields: z.array(z.string()).min(1),
});

const privacy = z.object({
  pii_scrub: z.boolean().default(true),
  pii_classifier: z.string().min(1),
  actions: z.array(piiAction).min(1),
});

const capability = z.object({
  local_ok_models: z.array(z.string()).default([]),
  tool_allowed_tiers: z.record(z.array(z.enum(["mlx", "ollama", "cloud"]))),
});

const perTool = z.record(
  z.object({
    max_calls: z.number().int().positive().default(1),
    max_tokens: z.number().int().nonnegative().default(0),
  })
);

const budgets = z.object({
  request: z.object({
    max_input_tokens: z.number().int().positive(),
    max_output_tokens: z.number().int().positive(),
    hard_cost_cap: z.number().nonnegative(),
    soft_cost_cap: z.number().nonnegative(),
  }),
  per_tool: perTool.default({}),
});

const latencySlo = z.object({
  p95_ms: z.number().int().positive(),
  first_token_ms: z.number().int().positive(),
});

const circuitBreakers = z.object({
  timeouts_ms: z.object({
    mlx: z.number().int().positive(),
    ollama: z.number().int().positive(),
    cloud: z.number().int().positive(),
  }),
  runaway_output_factor: z.number().positive().default(1.5),
  retries: z.object({
    mlx: z.number().int().min(0).default(0),
    ollama: z.number().int().min(0).default(1),
    cloud: z.number().int().min(0).default(1),
  }),
});

const tier = z.object({
  adapter: z.string().min(1),
  models: z.array(z.string()).min(1),
});

const tiers = z.object({
  mlx: tier,
  ollama: tier,
  cloud: tier,
});

const telemetry = z.object({
  exporter: z.enum(["prometheus", "otlp"]).default("prometheus"),
  resource: z.record(z.string(), z.any()).default({}),
  sampling: z
    .object({
      type: z
        .enum(["always_on", "always_off", "parentbased_traceidratio"])
        .default("parentbased_traceidratio"),
      ratio: z.number().min(0).max(1).default(0.25),
    })
    .default({}),
});

const audit = z
  .object({
    sink: z.enum(["file", "stdout"]).default("file"),
    path: z.string().optional(),
    redact_fields: z.array(z.string()).default([]),
  })
  .refine((v) => v.sink !== "file" || !!v.path, {
    message: "audit.path required when sink=file",
  });

export const RouterConfigSchema = z.object({
  version: z.union([z.string(), z.number()]).default(1),
  id: z.string().min(1),
  routing: z.object({
    order: z.array(z.enum(["privacy", "capability", "latency", "cost"])).nonempty(),
    privacy,
    capability,
    budgets,
    latency_slo: latencySlo,
    circuit_breakers: circuitBreakers,
  }),
  tiers,
  telemetry,
  audit,
});

export type RouterConfig = z.infer<typeof RouterConfigSchema>;
