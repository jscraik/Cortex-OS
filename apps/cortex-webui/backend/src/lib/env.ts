import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  // Required secrets
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // OAuth providers (conditional based on usage)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),

  // Configuration
  BASE_URL: z.string().url('BASE_URL must be a valid URL').or(z.literal('')).transform(val => val || 'http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default(':memory:'),

  // Optional features
  ENFORCE_2FA: z.string().transform(val => val === 'true').default('false'),
  COOKIE_DOMAIN: z.string().optional(),
});

// Validate environment variables
export function validateEnvironment() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(err =>
      `${err.path.join('.')}: ${err.message}`
    );

    throw new Error(
      `Environment validation failed:\n${errors.join('\n')}\n\n` +
      `Please check your .env file and ensure all required environment variables are set.`
    );
  }

  // Warn if OAuth providers are partially configured
  const providers = ['github', 'google', 'discord'];
  const warnings: string[] = [];

  for (const provider of providers) {
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];

    if (clientId && !clientSecret) {
      warnings.push(`${provider}: CLIENT_ID is set but CLIENT_SECRET is missing`);
    } else if (!clientId && clientSecret) {
      warnings.push(`${provider}: CLIENT_SECRET is set but CLIENT_ID is missing`);
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️  OAuth provider configuration warnings:');
    warnings.forEach(warning => console.warn(`   ${warning}`));
  }

  return result.data;
}

// Export validated environment for use in modules
export const env = validateEnvironment();