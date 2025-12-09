import 'dotenv/config';
import { z } from 'zod/v4';

const envSchema = z.object({
    // Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),

    // CORS - comma-separated origins (use * for development)
    ALLOWED_ORIGINS: z.string().default('*'),

    // Database (Azure SQL)
    DB_SERVER: z.string().min(1, 'DB_SERVER is required'),
    DB_DATABASE: z.string().min(1, 'DB_DATABASE is required'),
    DB_USER: z.string().min(1, 'DB_USER is required'),
    DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
    DB_PORT: z.coerce.number().default(1433),

    // JWT
    ACCESS_TOKEN_SECRET: z.string().min(10, 'ACCESS_TOKEN_SECRET must be at least 10 characters'),
    REFRESH_TOKEN_SECRET: z.string().min(10, 'REFRESH_TOKEN_SECRET must be at least 10 characters'),
    ACCESS_TOKEN_LIFE: z.string().default('15m'),
    REFRESH_TOKEN_LIFE: z.string().default('7d'),

    // Azure Communication Services (Email)
    AZURE_COMMUNICATION_CONNECTION_STRING: z.string().min(1, 'AZURE_COMMUNICATION_CONNECTION_STRING is required'),
    AZURE_SENDER: z.string().email('AZURE_SENDER must be a valid email'),

    // Social Auth - Google
    GOOGLE_CLIENT_ID: z.string().optional(),

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

// Helper to build DATABASE_URL for Prisma
export const getDatabaseUrl = (): string => {
    return `sqlserver://${env.DB_SERVER}:${env.DB_PORT};database=${env.DB_DATABASE};user=${env.DB_USER};password=${env.DB_PASSWORD};encrypt=true;trustServerCertificate=false`;
};

export type Env = z.infer<typeof envSchema>;
