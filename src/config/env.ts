import { z } from 'zod/v4';

const envSchema = z.object({
    // Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // JWT
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // SendGrid
    SENDGRID_API_KEY: z.string().min(1, 'SENDGRID_API_KEY is required'),
    SENDGRID_FROM_EMAIL: z.string().email('SENDGRID_FROM_EMAIL must be a valid email'),
    SENDGRID_FROM_NAME: z.string().default('Fitness App'),

    // Social Auth - Google
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Social Auth - Apple
    APPLE_CLIENT_ID: z.string().optional(),
    APPLE_TEAM_ID: z.string().optional(),
    APPLE_KEY_ID: z.string().optional(),
    APPLE_PRIVATE_KEY_PATH: z.string().optional(),

    // Social Auth - Facebook
    FACEBOOK_APP_ID: z.string().optional(),
    FACEBOOK_APP_SECRET: z.string().optional(),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

    // Cleanup Job
    CLEANUP_INTERVAL_MS: z.coerce.number().default(900000),
    UNVERIFIED_ACCOUNT_TTL_DAYS: z.coerce.number().default(7),
    INACTIVE_DEVICE_TTL_DAYS: z.coerce.number().default(30),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_DIR: z.string().default('./logs'),
});

// Load environment variables
const parseEnv = () => {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        process.exit(1);
    }

    return result.data;
};

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
