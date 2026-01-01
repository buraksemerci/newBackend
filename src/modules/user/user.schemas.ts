import { z } from 'zod/v4';
import {
    profileSchema,
    bodySchema,
    settingsSchema,
    goalsSchema,
} from '../auth/auth.schemas.js';

export const updateProfileSchema = profileSchema.partial();
export const updateBodySchema = bodySchema.partial();
export const updateSettingsSchema = settingsSchema.partial().extend({
    workoutReminders: z.boolean().optional(),
    progressUpdates: z.boolean().optional(),
});
export const updateFitnessGoalSchema = z.object({
    fitnessGoalId: z.number().int().positive(),
});

export const changeUsernameSchema = z.object({
    username: z
        .string()
        .min(8, 'Username must be at least 8 characters')
        .max(16, 'Username must be at most 16 characters')
        .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
        .transform((v) => v.toLowerCase()),
});

export const searchUsersSchema = z.object({
    q: z.string().min(2, 'Search query must be at least 2 characters').max(50),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});
