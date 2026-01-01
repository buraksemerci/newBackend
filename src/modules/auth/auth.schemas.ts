import { z } from 'zod/v4';
import { Gender, DeviceType, Theme, Unit, Somatotype, ExperienceLevel } from '../../types/index.js';

// Common schemas
const emailSchema = z.string().email('Invalid email format').transform((v) => v.toLowerCase().trim());

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number');

const usernameSchema = z
    .string()
    .min(8, 'Username must be at least 8 characters')
    .max(16, 'Username must be at most 16 characters')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
    .transform((v) => v.toLowerCase());

const deviceSchema = z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
    deviceName: z.string().optional(),
    deviceType: z.nativeEnum(DeviceType),
    fcmToken: z.string().optional(),
});

// ============================================================================
// REGISTRATION
// ============================================================================

// Profile Schema
export const profileSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    birthDate: z.coerce.date().refine(
        (date) => {
            const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            return age >= 13 && age <= 85;
        },
        { message: 'Age must be between 13 and 85 years' }
    ),
    gender: z.nativeEnum(Gender),
    experienceLevelId: z.number().int().min(1).max(3).default(1),  // 1=BEGINNER, 2=INTERMEDIATE, 3=ADVANCED
});

// Body Schema
export const bodySchema = z.object({
    heightCm: z.number().min(100, 'Height must be at least 100cm').max(250, 'Height must be at most 250cm'),
    weightKg: z.number().min(30, 'Weight must be at least 30kg').max(300, 'Weight must be at most 300kg'),
    targetWeightKg: z.number().min(30).max(300).optional(),
    somatotype: z.nativeEnum(Somatotype),
});

// Settings Schema
export const settingsSchema = z.object({
    preferredUnit: z.nativeEnum(Unit).default(Unit.METRIC),
    languageId: z.number().int().positive('Invalid language ID'),
    theme: z.nativeEnum(Theme).default(Theme.SYSTEM),
});

// Goals Schema
export const goalsSchema = z.object({
    fitnessGoalId: z.number().int().positive('Invalid fitness goal ID'),
    bodyTargetIds: z.array(z.number().int().positive()).min(1, 'At least one body target is required'),
});

// Health Limitations Schema - with severity (1-3)
export const healthLimitationSchema = z.object({
    id: z.number().int().positive('Invalid health limitation ID'),
    severity: z.number().int().min(1).max(3),
});

export const healthLimitationsSchema = z.array(healthLimitationSchema).optional().default([]);

export const registerSchema = z.object({
    // Auth
    email: emailSchema,
    password: passwordSchema,
    username: usernameSchema,

    // Profile
    profile: profileSchema,

    // Body
    body: bodySchema,

    // Settings
    settings: settingsSchema,

    // Goals
    goals: goalsSchema,

    // Health Limitations with severity
    healthLimitations: healthLimitationsSchema,

    // Device
    device: deviceSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================================================
// SOCIAL REGISTRATION
// ============================================================================

export const socialRegisterSchema = z.object({
    // Social auth token (verified by backend)
    provider: z.enum(['GOOGLE', 'APPLE', 'FACEBOOK']),
    providerToken: z.string().min(1, 'Provider token is required'),

    // Username still required
    username: usernameSchema,

    // Profile
    profile: profileSchema,

    // Body
    body: bodySchema,

    // Settings
    settings: settingsSchema,

    // Goals
    goals: goalsSchema,

    // Health Limitations with severity
    healthLimitations: healthLimitationsSchema,

    // Device
    device: deviceSchema,
});

export type SocialRegisterInput = z.infer<typeof socialRegisterSchema>;

// ============================================================================
// LOGIN
// ============================================================================

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    device: deviceSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// SOCIAL LOGIN
// ============================================================================

export const socialLoginSchema = z.object({
    provider: z.enum(['GOOGLE', 'APPLE', 'FACEBOOK']),
    providerToken: z.string().min(1, 'Provider token is required'),
    device: deviceSchema,
});

export type SocialLoginInput = z.infer<typeof socialLoginSchema>;

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

export const verifyEmailSchema = z.object({
    code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
    // Optional - if not provided, uses authenticated user's email
    email: emailSchema.optional(),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

// ============================================================================
// PASSWORD RESET
// ============================================================================

export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================================================
// TOKEN
// ============================================================================

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ============================================================================
// SOCIAL ACCOUNT MANAGEMENT
// ============================================================================

export const linkSocialSchema = z.object({
    provider: z.enum(['GOOGLE', 'APPLE', 'FACEBOOK']),
    providerToken: z.string().min(1, 'Provider token is required'),
});

export type LinkSocialInput = z.infer<typeof linkSocialSchema>;

export const unlinkSocialSchema = z.object({
    provider: z.enum(['GOOGLE', 'APPLE', 'FACEBOOK']),
});

export type UnlinkSocialInput = z.infer<typeof unlinkSocialSchema>;

// ============================================================================
// MERGE REQUEST
// ============================================================================

export const confirmMergeSchema = z.object({
    confirmMerge: z.boolean(),
    provider: z.enum(['GOOGLE', 'APPLE', 'FACEBOOK']),
    providerToken: z.string().min(1),
    device: deviceSchema,
});

export type ConfirmMergeInput = z.infer<typeof confirmMergeSchema>;
