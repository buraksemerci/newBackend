import { prisma, logger, authLogger } from '../../config/index.js';
import { Prisma } from '@prisma/client';
import { ExternalProvider } from '../../types/index.js';
import {
    hashPassword,
    comparePassword,
    validatePasswordStrength,
} from '../../services/password.service.js';
import {
    generateTokenPair,
    hashRefreshToken,
    verifyRefreshToken,
    getRefreshTokenExpiry,
} from '../../services/jwt.service.js';
import {
    sendVerificationCode,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendNewDeviceAlert,
} from '../../services/email.service.js';
import {
    generateVerificationCode,
    generateSecureToken,
    hashToken,
    calculateExpiry,
    isExpired,
} from '../../utils/codeGenerator.util.js';
import { AppError } from '../../middleware/error.middleware.js';
import { ErrorCodes } from '../../utils/response.util.js';
import {
    RegisterInput,
    SocialRegisterInput,
    LoginInput,
    SocialLoginInput,
} from './auth.schemas.js';
import { TokenPair, AuthResponse, DeviceInfo } from '../../types/index.js';
import * as deviceService from '../device/device.service.js';
import { uuidv7 } from 'uuidv7';

// Constants
const VERIFICATION_CODE_EXPIRY_MINUTES = 15;
const PASSWORD_RESET_EXPIRY_MINUTES = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;
const MAX_DAILY_VERIFICATION_SENDS = 5;
const RESEND_COOLDOWN_BASE_SECONDS = 60;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

interface RegistrationLookups {
    fitnessGoalId: number;
    bodyTargetIds: number[];
    healthLimitations?: Array<{ id: number; severity: number }>;
    languageId: number;
}

/**
 * Validate all lookup table IDs exist before registration
 */
const validateRegistrationLookups = async (lookups: RegistrationLookups): Promise<void> => {
    const errors: string[] = [];

    // Validate fitnessGoal
    const fitnessGoal = await prisma.fitnessGoal.findUnique({ where: { fitness_goal_id: lookups.fitnessGoalId } });
    if (!fitnessGoal) {
        errors.push(`Invalid fitnessGoalId: ${lookups.fitnessGoalId}`);
    }

    // Validate language
    const language = await prisma.language.findUnique({ where: { language_id: lookups.languageId } });
    if (!language || !language.is_active) {
        errors.push(`Invalid or inactive languageId: ${lookups.languageId}`);
    }

    // Validate bodyTargets
    if (lookups.bodyTargetIds.length > 0) {
        const bodyTargets = await prisma.bodyTarget.findMany({
            where: { body_target_id: { in: lookups.bodyTargetIds } },
            select: { body_target_id: true },
        });
        const foundIds = new Set(bodyTargets.map(bt => bt.body_target_id));
        const missingIds = lookups.bodyTargetIds.filter(id => !foundIds.has(id));
        if (missingIds.length > 0) {
            errors.push(`Invalid bodyTargetIds: ${missingIds.join(', ')}`);
        }
    }

    // Validate healthLimitations
    if (lookups.healthLimitations && lookups.healthLimitations.length > 0) {
        const healthLimitationIds = lookups.healthLimitations.map(hl => hl.id);
        const healthLimitations = await prisma.healthLimitation.findMany({
            where: { health_limitation_id: { in: healthLimitationIds } },
            select: { health_limitation_id: true },
        });
        const foundIds = new Set(healthLimitations.map(hl => hl.health_limitation_id));
        const missingIds = healthLimitationIds.filter(id => !foundIds.has(id));
        if (missingIds.length > 0) {
            errors.push(`Invalid healthLimitationIds: ${missingIds.join(', ')}`);
        }
    }

    if (errors.length > 0) {
        throw new AppError(
            ErrorCodes.VALIDATION_ERROR,
            `Invalid lookup IDs: ${errors.join('; ')}`,
            400
        );
    }
};

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Register a new user with all onboarding data (atomic transaction)
 */
export const registerUser = async (input: RegisterInput): Promise<AuthResponse> => {
    const normalizedEmail = input.email.toLowerCase().trim();
    const normalizedUsername = input.username.toLowerCase();

    // Validate all lookup IDs exist before proceeding
    await validateRegistrationLookups({
        fitnessGoalId: input.goals.fitnessGoalId,
        bodyTargetIds: input.goals.bodyTargetIds,
        healthLimitations: input.healthLimitations,
        languageId: input.settings.languageId,
    });

    // Check if email is taken by a verified user
    const existingVerifiedUser = await prisma.user.findFirst({
        where: {
            email: normalizedEmail,
            is_email_verified: true,
            deleted_at: null,
        },
    });

    if (existingVerifiedUser) {
        throw new AppError(ErrorCodes.EMAIL_ALREADY_EXISTS, 'Email is already registered', 409);
    }

    // Check if username is taken (exclude soft-deleted users)
    const existingUsername = await prisma.user.findFirst({
        where: {
            username: normalizedUsername,
            deleted_at: null,
        },
    });

    if (existingUsername) {
        throw new AppError(ErrorCodes.USERNAME_TAKEN, 'Username is already taken', 409);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.valid) {
        throw new AppError(ErrorCodes.PASSWORD_TOO_WEAK, passwordValidation.errors.join(', '), 400);
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeHash = hashToken(verificationCode);

    // Generate UUIDs
    const userId = uuidv7();
    const deviceId = uuidv7();
    const verificationTokenId = uuidv7();
    const refreshTokenId = uuidv7();

    // Perform atomic registration
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Delete any existing unverified user with this email
        await tx.user.deleteMany({
            where: {
                email: normalizedEmail,
                is_email_verified: false,
            },
        });

        // Create user
        const user = await tx.user.create({
            data: {
                user_id: userId,
                email: normalizedEmail,
                username: normalizedUsername,
                is_email_verified: false,
            },
        });

        // Create profile
        await tx.userProfile.create({
            data: {
                user_id: user.user_id,
                first_name: input.profile.firstName,
                last_name: input.profile.lastName,
                birth_date: input.profile.birthDate,
                gender: input.profile.gender,
                experience_level_id: input.profile.experienceLevelId,
            },
        });

        // Create body info
        await tx.userBody.create({
            data: {
                user_id: user.user_id,
                height_cm: input.body.heightCm,
                weight_kg: input.body.weightKg,
                target_weight_kg: input.body.targetWeightKg,
                somatotype: input.body.somatotype,
            },
        });

        // Create settings
        await tx.userSetting.create({
            data: {
                user_id: user.user_id,
                preferred_unit: input.settings.preferredUnit,
                language_id: input.settings.languageId,
                theme: input.settings.theme,
            },
        });

        // Create local credential
        await tx.userLocalCredential.create({
            data: {
                user_id: user.user_id,
                password_hash: passwordHash,
            },
        });

        // Create user goals
        await tx.userGoals.create({
            data: {
                user_id: user.user_id,
                fitness_goal_id: input.goals.fitnessGoalId,
            },
        });

        // Validate and Create user body targets (linked to User directly)
        if (input.goals.bodyTargetIds.length > 0) {
            // Fetch target genders for validation
            const targets = await tx.bodyTarget.findMany({
                where: { body_target_id: { in: input.goals.bodyTargetIds } },
                select: { body_target_id: true, target_gender: true }
            });

            // GENDER VALIDATION LOGIC
            // MALE User -> Can pick MALE or UNISEX
            // FEMALE User -> Can pick FEMALE or UNISEX
            // UNISEX User (if supported) -> Can pick UNISEX only
            const userGender = input.profile.gender; // "MALE", "FEMALE"

            for (const target of targets) {
                const isCompatible =
                    target.target_gender === 'UNISEX' ||
                    target.target_gender === userGender;

                if (!isCompatible) {
                    throw new AppError(
                        ErrorCodes.VALIDATION_ERROR,
                        `Gender mismatch: User is ${userGender}, but target ${target.body_target_id} is ${target.target_gender}`,
                        400
                    );
                }
            }

            // Create Relation
            await tx.userBodyTarget.createMany({
                data: input.goals.bodyTargetIds.map((bodyTargetId) => ({
                    user_id: user.user_id, // Updated from user_goals_user_id
                    body_target_id: bodyTargetId,
                })),
            });
        }

        // Create health limitations with severity
        if (input.healthLimitations && input.healthLimitations.length > 0) {
            await tx.userHealthLimitation.createMany({
                data: input.healthLimitations.map((hl) => ({
                    user_id: user.user_id,
                    health_limitation_id: hl.id,
                    user_severity: hl.severity,
                })),
            });
        }

        // Create device
        const device = await tx.userDevice.create({
            data: {
                user_device_id: deviceId,
                user_id: user.user_id,
                device_id: input.device.deviceId,
                device_name: input.device.deviceName,
                device_type: input.device.deviceType,
                fcm_token: input.device.fcmToken,
            },
        });

        // Create verification token
        await tx.verificationToken.create({
            data: {
                verification_token_id: verificationTokenId,
                user_id: user.user_id,
                type: 'EMAIL_VERIFICATION',
                token_hash: verificationCodeHash,
                expires_at: calculateExpiry(VERIFICATION_CODE_EXPIRY_MINUTES),
                attempts_left: MAX_VERIFICATION_ATTEMPTS,
                sent_count: 1,
            },
        });

        // Generate tokens
        const tokens = generateTokenPair(user.user_id, device.user_device_id, device.user_device_id);

        // Store refresh token
        await tx.refreshToken.create({
            data: {
                refresh_token_id: refreshTokenId,
                user_id: user.user_id,
                user_device_id: device.user_device_id,
                token_hash: hashRefreshToken(tokens.refreshToken),
                expires_at: tokens.expiresAt,
            },
        });

        return { user, device, tokens };
    });

    // Send verification email (outside transaction)
    try {
        await sendVerificationCode(
            normalizedEmail,
            verificationCode,
            input.profile.firstName
        );
    } catch (emailError) {
        logger.error('Failed to send verification email during registration', {
            userId: result.user.user_id,
            email: normalizedEmail,
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
    }

    authLogger.registerSuccess(result.user.user_id, normalizedEmail);

    return {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        user: {
            id: result.user.user_id,
            email: result.user.email,
            username: result.user.username,
            isEmailVerified: result.user.is_email_verified,
            firstName: input.profile.firstName,
            lastName: input.profile.lastName,
        },
    };
};

/**
 * Register a new user with social auth
 */
export const registerWithSocial = async (
    input: SocialRegisterInput,
    socialData: { email: string; providerKey: string; provider: ExternalProvider }
): Promise<AuthResponse> => {
    const normalizedEmail = socialData.email.toLowerCase().trim();
    const normalizedUsername = input.username.toLowerCase();

    // Validate all lookup IDs exist before proceeding
    await validateRegistrationLookups({
        fitnessGoalId: input.goals.fitnessGoalId,
        bodyTargetIds: input.goals.bodyTargetIds,
        healthLimitations: input.healthLimitations,
        languageId: input.settings.languageId,
    });

    // Check for existing verified user with this email
    const existingVerifiedUser = await prisma.user.findFirst({
        where: {
            email: normalizedEmail,
            is_email_verified: true,
            deleted_at: null,
        },
    });

    if (existingVerifiedUser) {
        // Check if this social account is already linked
        const existingLink = await prisma.userExternalLogin.findFirst({
            where: {
                user_id: existingVerifiedUser.user_id,
                provider: socialData.provider,
                provider_key: socialData.providerKey,
            },
        });

        if (existingLink) {
            throw new AppError(
                ErrorCodes.EMAIL_ALREADY_EXISTS,
                'This social account is already linked to another user',
                409
            );
        }

        throw new AppError(
            ErrorCodes.ACCOUNT_MERGE_REQUIRED,
            'An account with this email already exists.',
            409,
            { existingUserId: existingVerifiedUser.user_id, requiresMerge: true }
        );
    }

    // Check username
    const existingUsername = await prisma.user.findFirst({
        where: {
            username: normalizedUsername,
            deleted_at: null,
        },
    });

    if (existingUsername) {
        throw new AppError(ErrorCodes.USERNAME_TAKEN, 'Username is already taken', 409);
    }

    // Generate UUIDs
    const userId = uuidv7();
    const deviceId = uuidv7();
    const refreshTokenId = uuidv7();

    // Atomic registration
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.user.deleteMany({
            where: {
                email: normalizedEmail,
                is_email_verified: false,
            },
        });

        const user = await tx.user.create({
            data: {
                user_id: userId,
                email: normalizedEmail,
                username: normalizedUsername,
                is_email_verified: true,
            },
        });

        await tx.userProfile.create({
            data: {
                user_id: user.user_id,
                first_name: input.profile.firstName,
                last_name: input.profile.lastName,
                birth_date: input.profile.birthDate,
                gender: input.profile.gender,
                experience_level_id: input.profile.experienceLevelId,
            },
        });

        await tx.userBody.create({
            data: {
                user_id: user.user_id,
                height_cm: input.body.heightCm,
                weight_kg: input.body.weightKg,
                target_weight_kg: input.body.targetWeightKg,
                somatotype: input.body.somatotype,
            },
        });

        await tx.userSetting.create({
            data: {
                user_id: user.user_id,
                preferred_unit: input.settings.preferredUnit,
                language_id: input.settings.languageId,
                theme: input.settings.theme,
            },
        });

        await tx.userExternalLogin.create({
            data: {
                user_id: user.user_id,
                provider: socialData.provider,
                provider_key: socialData.providerKey,
            },
        });

        await tx.userGoals.create({
            data: {
                user_id: user.user_id,
                fitness_goal_id: input.goals.fitnessGoalId,
            },
        });

        if (input.goals.bodyTargetIds.length > 0) {
            // Fetch target genders for validation
            const targets = await tx.bodyTarget.findMany({
                where: { body_target_id: { in: input.goals.bodyTargetIds } },
                select: { body_target_id: true, target_gender: true }
            });

            // GENDER VALIDATION LOGIC
            const userGender = input.profile.gender; // "MALE", "FEMALE"

            for (const target of targets) {
                const isCompatible =
                    target.target_gender === 'UNISEX' ||
                    target.target_gender === userGender;

                if (!isCompatible) {
                    throw new AppError(
                        ErrorCodes.VALIDATION_ERROR,
                        `Gender mismatch: User is ${userGender}, but target ${target.body_target_id} is ${target.target_gender}`,
                        400
                    );
                }
            }

            await tx.userBodyTarget.createMany({
                data: input.goals.bodyTargetIds.map((id: number) => ({
                    user_id: user.user_id, // Updated from user_goals_user_id
                    body_target_id: id,
                })),
            });
        }

        // Create health limitations with severity
        if (input.healthLimitations && input.healthLimitations.length > 0) {
            await tx.userHealthLimitation.createMany({
                data: input.healthLimitations.map((hl) => ({
                    user_id: user.user_id,
                    health_limitation_id: hl.id,
                    user_severity: hl.severity,
                })),
            });
        }

        const device = await tx.userDevice.create({
            data: {
                user_device_id: deviceId,
                user_id: user.user_id,
                device_id: input.device.deviceId,
                device_name: input.device.deviceName,
                device_type: input.device.deviceType,
                fcm_token: input.device.fcmToken,
            },
        });

        const tokens = generateTokenPair(user.user_id, device.user_device_id, device.user_device_id);

        await tx.refreshToken.create({
            data: {
                refresh_token_id: refreshTokenId,
                user_id: user.user_id,
                user_device_id: device.user_device_id,
                token_hash: hashRefreshToken(tokens.refreshToken),
                expires_at: tokens.expiresAt,
            },
        });

        return { user, device, tokens };
    });

    try {
        await sendWelcomeEmail(normalizedEmail, input.profile.firstName);
    } catch (emailError) {
        logger.error('Failed to send welcome email', {
            userId: result.user.user_id,
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
    }

    authLogger.registerSuccess(result.user.user_id, normalizedEmail);

    return {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        user: {
            id: result.user.user_id,
            email: result.user.email,
            username: result.user.username,
            isEmailVerified: result.user.is_email_verified,
            firstName: input.profile.firstName,
            lastName: input.profile.lastName,
        },
    };
};

// ============================================================================
// LOGIN
// ============================================================================

/**
 * Login with email and password
 */
export const loginWithEmail = async (input: LoginInput): Promise<AuthResponse> => {
    const normalizedEmail = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
            local_credential: true,
            profile: true,
        },
    });

    if (!user || user.deleted_at) {
        authLogger.loginFailed(normalizedEmail, 'User not found');
        throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    if (!user.local_credential) {
        authLogger.loginFailed(normalizedEmail, 'No local credential');
        throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    if (user.local_credential.locked_until && new Date() < user.local_credential.locked_until) {
        const waitMinutes = Math.ceil(
            (user.local_credential.locked_until.getTime() - Date.now()) / 60000
        );
        throw new AppError(
            ErrorCodes.RATE_LIMIT_EXCEEDED,
            `Account temporarily locked. Try again in ${waitMinutes} minutes`,
            429
        );
    }

    const isValidPassword = await comparePassword(input.password, user.local_credential.password_hash);

    if (!isValidPassword) {
        const newAttempts = user.local_credential.failed_attempts + 1;
        const shouldLock = newAttempts >= 5;

        await prisma.userLocalCredential.update({
            where: { user_local_credential_id: user.local_credential.user_local_credential_id },
            data: {
                failed_attempts: newAttempts,
                locked_until: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
            },
        });

        authLogger.loginFailed(normalizedEmail, 'Invalid password');
        throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    await prisma.userLocalCredential.update({
        where: { user_local_credential_id: user.local_credential.user_local_credential_id },
        data: { failed_attempts: 0, locked_until: null },
    });

    // If user is not email verified, send a new verification code
    // But still allow login so they can verify
    if (!user.is_email_verified) {
        const code = generateVerificationCode();
        const tokenId = uuidv7();

        await prisma.verificationToken.deleteMany({
            where: { user_id: user.user_id, type: 'EMAIL_VERIFICATION' }
        });
        await prisma.verificationToken.create({
            data: {
                verification_token_id: tokenId,
                user_id: user.user_id,
                type: 'EMAIL_VERIFICATION',
                token_hash: hashToken(code),
                expires_at: calculateExpiry(VERIFICATION_CODE_EXPIRY_MINUTES),
                attempts_left: MAX_VERIFICATION_ATTEMPTS,
            },
        });
        await sendVerificationCode(user.email, code, user.profile?.first_name);
    }

    const device = await deviceService.registerOrUpdateDevice(user.user_id, input.device);
    const tokens = generateTokenPair(user.user_id, device.id, device.id);

    await prisma.refreshToken.deleteMany({
        where: { user_device_id: device.id },
    });

    const refreshTokenId = uuidv7();
    await prisma.refreshToken.create({
        data: {
            refresh_token_id: refreshTokenId,
            user_id: user.user_id,
            user_device_id: device.id,
            token_hash: hashRefreshToken(tokens.refreshToken),
            expires_at: tokens.expiresAt,
        },
    });

    authLogger.loginSuccess(user.user_id, device.id, 'local');

    return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
            id: user.user_id,
            email: user.email,
            username: user.username,
            isEmailVerified: user.is_email_verified,
            firstName: user.profile?.first_name ?? null,
            lastName: user.profile?.last_name ?? null,
        },
    };
};

/**
 * Login with social provider
 */
export const loginWithSocial = async (
    input: SocialLoginInput,
    socialData: { email: string; providerKey: string; provider: ExternalProvider }
): Promise<AuthResponse | { requiresMerge: true; email: string }> => {
    const normalizedEmail = socialData.email.toLowerCase().trim();

    const existingLogin = await prisma.userExternalLogin.findFirst({
        where: {
            provider: socialData.provider,
            provider_key: socialData.providerKey,
        },
        include: {
            user: {
                include: { profile: true },
            },
        },
    });

    if (existingLogin && !existingLogin.user.deleted_at) {
        const user = existingLogin.user;

        const device = await deviceService.registerOrUpdateDevice(user.user_id, input.device);
        const tokens = generateTokenPair(user.user_id, device.id, device.id);

        await prisma.refreshToken.deleteMany({ where: { user_device_id: device.id } });

        const refreshTokenId = uuidv7();
        await prisma.refreshToken.create({
            data: {
                refresh_token_id: refreshTokenId,
                user_id: user.user_id,
                user_device_id: device.id,
                token_hash: hashRefreshToken(tokens.refreshToken),
                expires_at: tokens.expiresAt,
            },
        });

        authLogger.loginSuccess(user.user_id, device.id, socialData.provider);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.user_id,
                email: user.email,
                username: user.username,
                isEmailVerified: user.is_email_verified,
                firstName: user.profile?.first_name ?? null,
                lastName: user.profile?.last_name ?? null,
            },
        };
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { profile: true },
    });

    if (existingUser && !existingUser.deleted_at) {
        if (existingUser.is_email_verified) {
            return {
                requiresMerge: true,
                email: normalizedEmail,
            };
        } else {
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                await tx.user.update({
                    where: { user_id: existingUser.user_id },
                    data: { is_email_verified: true },
                });

                await tx.userExternalLogin.create({
                    data: {
                        user_id: existingUser.user_id,
                        provider: socialData.provider,
                        provider_key: socialData.providerKey,
                    },
                });
            });

            const device = await deviceService.registerOrUpdateDevice(existingUser.user_id, input.device);
            const tokens = generateTokenPair(existingUser.user_id, device.id, device.id);

            await prisma.refreshToken.deleteMany({ where: { user_device_id: device.id } });

            const refreshTokenId = uuidv7();
            await prisma.refreshToken.create({
                data: {
                    refresh_token_id: refreshTokenId,
                    user_id: existingUser.user_id,
                    user_device_id: device.id,
                    token_hash: hashRefreshToken(tokens.refreshToken),
                    expires_at: tokens.expiresAt,
                },
            });

            authLogger.loginSuccess(existingUser.user_id, device.id, socialData.provider);

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: {
                    id: existingUser.user_id,
                    email: existingUser.email,
                    username: existingUser.username,
                    isEmailVerified: true,
                    firstName: existingUser.profile?.first_name ?? null,
                    lastName: existingUser.profile?.last_name ?? null,
                },
            };
        }
    }

    throw new AppError(
        ErrorCodes.USER_NOT_FOUND,
        'No account found. Please register first.',
        404,
        { requiresRegistration: true }
    );
};

/**
 * Merge social account with existing account
 */
export const mergeSocialAccount = async (
    userId: string,
    socialData: { provider: ExternalProvider; providerKey: string },
    device: DeviceInfo
): Promise<AuthResponse> => {
    const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: { profile: true },
    });

    if (!user || user.deleted_at) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    await prisma.userExternalLogin.create({
        data: {
            user_id: user.user_id,
            provider: socialData.provider,
            provider_key: socialData.providerKey,
        },
    });

    const userDevice = await deviceService.registerOrUpdateDevice(user.user_id, device);
    const tokens = generateTokenPair(user.user_id, userDevice.id, userDevice.id);

    await prisma.refreshToken.deleteMany({ where: { user_device_id: userDevice.id } });

    const refreshTokenId = uuidv7();
    await prisma.refreshToken.create({
        data: {
            refresh_token_id: refreshTokenId,
            user_id: user.user_id,
            user_device_id: userDevice.id,
            token_hash: hashRefreshToken(tokens.refreshToken),
            expires_at: tokens.expiresAt,
        },
    });

    logger.info('Social account merged', {
        userId: user.user_id,
        provider: socialData.provider,
        action: 'ACCOUNT_MERGED',
    });

    return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
            id: user.user_id,
            email: user.email,
            username: user.username,
            isEmailVerified: user.is_email_verified,
            firstName: user.profile?.first_name ?? null,
            lastName: user.profile?.last_name ?? null,
        },
    };
};

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

/**
 * Verify email with 6-digit code
 */
export const verifyEmail = async (userId: string, code: string): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: { verification_tokens: { where: { type: 'EMAIL_VERIFICATION' } } },
    });

    if (!user) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    if (user.is_email_verified) {
        return;
    }

    const token = user.verification_tokens[0];

    if (!token) {
        throw new AppError(
            ErrorCodes.VERIFICATION_CODE_EXPIRED,
            'No verification code found. Please request a new one.',
            410
        );
    }

    if (isExpired(token.expires_at)) {
        throw new AppError(
            ErrorCodes.VERIFICATION_CODE_EXPIRED,
            'Verification code has expired. Please request a new one.',
            410
        );
    }

    if (token.attempts_left <= 0) {
        throw new AppError(
            ErrorCodes.MAX_VERIFICATION_ATTEMPTS,
            'Maximum attempts exceeded. Please request a new code.',
            429
        );
    }

    const codeHash = hashToken(code);

    if (codeHash !== token.token_hash) {
        await prisma.verificationToken.update({
            where: { verification_token_id: token.verification_token_id },
            data: { attempts_left: token.attempts_left - 1 },
        });

        throw new AppError(
            ErrorCodes.VERIFICATION_CODE_INVALID,
            `Invalid code. ${token.attempts_left - 1} attempts remaining.`,
            400
        );
    }

    await prisma.$transaction([
        prisma.user.update({
            where: { user_id: userId },
            data: { is_email_verified: true },
        }),
        prisma.verificationToken.deleteMany({
            where: { user_id: userId, type: 'EMAIL_VERIFICATION' },
        }),
    ]);

    authLogger.emailVerified(userId);

    const profile = await prisma.userProfile.findUnique({ where: { user_id: userId } });
    if (profile) {
        await sendWelcomeEmail(user.email, profile.first_name);
    }
};

/**
 * Resend verification code
 */
export const resendVerificationCode = async (
    userId: string
): Promise<{ cooldownSeconds: number }> => {
    const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: {
            verification_tokens: { where: { type: 'EMAIL_VERIFICATION' } },
            profile: true,
        },
    });

    if (!user) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    if (user.is_email_verified) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Email is already verified', 400);
    }

    const existingToken = user.verification_tokens[0];

    if (existingToken) {
        const cooldownSeconds = RESEND_COOLDOWN_BASE_SECONDS * existingToken.sent_count;
        const cooldownEnd = new Date(existingToken.last_sent_at.getTime() + cooldownSeconds * 1000);

        if (new Date() < cooldownEnd) {
            const remainingSeconds = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
            throw new AppError(
                ErrorCodes.VERIFICATION_RESEND_COOLDOWN,
                `Please wait ${remainingSeconds} seconds before requesting a new code`,
                429,
                { cooldownSeconds: remainingSeconds }
            );
        }

        if (existingToken.sent_count >= MAX_DAILY_VERIFICATION_SENDS) {
            throw new AppError(
                ErrorCodes.MAX_DAILY_VERIFICATIONS,
                'Maximum daily verification emails reached. Please try again tomorrow.',
                429
            );
        }

        const newCode = generateVerificationCode();

        await prisma.verificationToken.update({
            where: { verification_token_id: existingToken.verification_token_id },
            data: {
                token_hash: hashToken(newCode),
                expires_at: calculateExpiry(VERIFICATION_CODE_EXPIRY_MINUTES),
                attempts_left: MAX_VERIFICATION_ATTEMPTS,
                sent_count: existingToken.sent_count + 1,
                last_sent_at: new Date(),
            },
        });

        await sendVerificationCode(user.email, newCode, user.profile?.first_name);

        const nextCooldown = RESEND_COOLDOWN_BASE_SECONDS * (existingToken.sent_count + 1);
        return { cooldownSeconds: nextCooldown };
    }

    const newCode = generateVerificationCode();
    const tokenId = uuidv7();

    await prisma.verificationToken.create({
        data: {
            verification_token_id: tokenId,
            user_id: userId,
            type: 'EMAIL_VERIFICATION',
            token_hash: hashToken(newCode),
            expires_at: calculateExpiry(VERIFICATION_CODE_EXPIRY_MINUTES),
            attempts_left: MAX_VERIFICATION_ATTEMPTS,
            sent_count: 1,
        },
    });

    await sendVerificationCode(user.email, newCode, user.profile?.first_name);

    return { cooldownSeconds: RESEND_COOLDOWN_BASE_SECONDS };
};

// ============================================================================
// PASSWORD RESET
// ============================================================================

/**
 * Request password reset email
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { profile: true, local_credential: true },
    });

    if (!user || user.deleted_at || !user.local_credential) {
        return;
    }

    const resetToken = generateSecureToken();
    const tokenHash = hashToken(resetToken);
    const tokenId = uuidv7();

    await prisma.verificationToken.deleteMany({
        where: { user_id: user.user_id, type: 'PASSWORD_RESET' },
    });

    await prisma.verificationToken.create({
        data: {
            verification_token_id: tokenId,
            user_id: user.user_id,
            type: 'PASSWORD_RESET',
            token_hash: tokenHash,
            expires_at: calculateExpiry(PASSWORD_RESET_EXPIRY_MINUTES),
        },
    });

    await sendPasswordResetEmail(user.email, resetToken, user.profile?.first_name);

    authLogger.passwordResetRequested(user.email);
};

/**
 * Reset password with token
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    const tokenHash = hashToken(token);

    const resetToken = await prisma.verificationToken.findFirst({
        where: { token_hash: tokenHash, type: 'PASSWORD_RESET' },
        include: { user: true },
    });

    if (!resetToken) {
        throw new AppError(ErrorCodes.PASSWORD_RESET_EXPIRED, 'Invalid or expired reset link', 410);
    }

    if (resetToken.is_used) {
        throw new AppError(ErrorCodes.PASSWORD_RESET_USED, 'This reset link has already been used', 410);
    }

    if (isExpired(resetToken.expires_at)) {
        throw new AppError(ErrorCodes.PASSWORD_RESET_EXPIRED, 'Reset link has expired', 410);
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
        throw new AppError(ErrorCodes.PASSWORD_TOO_WEAK, validation.errors.join(', '), 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
        prisma.userLocalCredential.update({
            where: { user_id: resetToken.user_id },
            data: { password_hash: passwordHash, last_password_change_at: new Date(), failed_attempts: 0, locked_until: null },
        }),
        prisma.verificationToken.update({
            where: { verification_token_id: resetToken.verification_token_id },
            data: { is_used: true },
        }),
        prisma.refreshToken.deleteMany({
            where: { user_id: resetToken.user_id },
        }),
    ]);

    authLogger.passwordChanged(resetToken.user_id);
};

/**
 * Change password (authenticated)
 */
export const changePassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string
): Promise<void> => {
    const credential = await prisma.userLocalCredential.findUnique({
        where: { user_id: userId },
    });

    if (!credential) {
        throw new AppError(
            ErrorCodes.VALIDATION_ERROR,
            'No password set for this account. Use social login.',
            400
        );
    }

    const isValid = await comparePassword(currentPassword, credential.password_hash);
    if (!isValid) {
        throw new AppError(ErrorCodes.INCORRECT_PASSWORD, 'Current password is incorrect', 401);
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
        throw new AppError(ErrorCodes.PASSWORD_TOO_WEAK, validation.errors.join(', '), 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
        prisma.userLocalCredential.update({
            where: { user_id: userId },
            data: { password_hash: passwordHash, last_password_change_at: new Date() },
        }),
        prisma.refreshToken.deleteMany({
            where: { user_id: userId },
        }),
    ]);

    authLogger.passwordChanged(userId);
};

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Refresh access token
 */
export const refreshTokens = async (
    refreshToken: string
): Promise<TokenPair & { userId: string; deviceId: string }> => {
    const result = verifyRefreshToken(refreshToken);

    if (!result.valid || !result.payload) {
        throw new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid refresh token', 401);
    }

    const { userId, deviceId, tokenId } = result.payload;
    const tokenHash = hashRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
        where: { token_hash: tokenHash },
        include: { user: true },
    });

    if (!storedToken) {
        authLogger.suspiciousActivity(userId, 'Refresh token reuse detected');
        await prisma.refreshToken.deleteMany({ where: { user_id: userId } });
        throw new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid refresh token', 401);
    }

    if (storedToken.user.deleted_at) {
        throw new AppError(ErrorCodes.USER_DELETED, 'User account has been deleted', 401);
    }

    const newTokens = generateTokenPair(userId, deviceId, tokenId);

    await prisma.refreshToken.update({
        where: { refresh_token_id: storedToken.refresh_token_id },
        data: {
            token_hash: hashRefreshToken(newTokens.refreshToken),
            expires_at: newTokens.expiresAt,
        },
    });

    await prisma.userDevice.update({
        where: { user_device_id: deviceId },
        data: { last_active_at: new Date() },
    });

    authLogger.tokenRefreshed(userId, deviceId);

    return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        userId,
        deviceId,
    };
};

/**
 * Logout from current device
 */
export const logout = async (userId: string, deviceId: string): Promise<void> => {
    await prisma.refreshToken.deleteMany({
        where: { user_id: userId, user_device_id: deviceId },
    });

    authLogger.logoutSuccess(userId, deviceId);
};

/**
 * Logout from all devices
 */
export const logoutAllDevices = async (userId: string): Promise<void> => {
    await prisma.refreshToken.deleteMany({
        where: { user_id: userId },
    });

    logger.info('User logged out from all devices', { userId, action: 'LOGOUT_ALL' });
};

// ============================================================================
// SOCIAL ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Link a social account to existing user
 */
export const linkSocialAccount = async (
    userId: string,
    provider: ExternalProvider,
    providerKey: string
): Promise<void> => {
    const existingLink = await prisma.userExternalLogin.findFirst({
        where: { user_id: userId, provider },
    });

    if (existingLink) {
        throw new AppError(
            ErrorCodes.ACCOUNT_ALREADY_LINKED,
            `A ${provider} account is already linked`,
            409
        );
    }

    const otherUserLink = await prisma.userExternalLogin.findFirst({
        where: { provider, provider_key: providerKey },
    });

    if (otherUserLink) {
        throw new AppError(
            ErrorCodes.ACCOUNT_ALREADY_LINKED,
            'This social account is already linked to another user',
            409
        );
    }

    await prisma.userExternalLogin.create({
        data: { user_id: userId, provider, provider_key: providerKey },
    });

    logger.info('Social account linked', { userId, provider, action: 'SOCIAL_LINKED' });
};

/**
 * Unlink a social account
 */
export const unlinkSocialAccount = async (
    userId: string,
    provider: ExternalProvider
): Promise<void> => {
    const [localCred, externalLogins] = await Promise.all([
        prisma.userLocalCredential.findUnique({ where: { user_id: userId } }),
        prisma.userExternalLogin.findMany({ where: { user_id: userId } }),
    ]);

    const hasLocalAuth = !!localCred;
    const socialCount = externalLogins.length;

    if (!hasLocalAuth && socialCount <= 1) {
        throw new AppError(
            ErrorCodes.CANNOT_REMOVE_LAST_AUTH,
            'Cannot remove the last authentication method.',
            400
        );
    }

    const toRemove = externalLogins.find((el) => el.provider === provider);
    if (!toRemove) {
        throw new AppError(ErrorCodes.NOT_FOUND, `No ${provider} account linked`, 404);
    }

    await prisma.userExternalLogin.delete({
        where: {
            user_id_provider_provider_key: {
                user_id: userId,
                provider: toRemove.provider,
                provider_key: toRemove.provider_key,
            },
        },
    });

    logger.info('Social account unlinked', { userId, provider, action: 'SOCIAL_UNLINKED' });
};
