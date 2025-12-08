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

// Constants
const VERIFICATION_CODE_EXPIRY_MINUTES = 15;
const PASSWORD_RESET_EXPIRY_MINUTES = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;
const MAX_DAILY_VERIFICATION_SENDS = 5;
const RESEND_COOLDOWN_BASE_SECONDS = 60;

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Register a new user with all onboarding data (atomic transaction)
 */
export const registerUser = async (input: RegisterInput): Promise<AuthResponse> => {
    const normalizedEmail = input.email.toLowerCase().trim();
    const normalizedUsername = input.username.toLowerCase();

    // Check if email is taken by a verified user
    const existingVerifiedUser = await prisma.user.findFirst({
        where: {
            email: normalizedEmail,
            isEmailVerified: true,
            deletedAt: null,
        },
    });

    if (existingVerifiedUser) {
        throw new AppError(ErrorCodes.EMAIL_ALREADY_EXISTS, 'Email is already registered', 409);
    }

    // Check if username is taken
    const existingUsername = await prisma.user.findUnique({
        where: { username: normalizedUsername },
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

    // Perform atomic registration
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Delete any existing unverified user with this email
        await tx.user.deleteMany({
            where: {
                email: normalizedEmail,
                isEmailVerified: false,
            },
        });

        // Create user
        const user = await tx.user.create({
            data: {
                email: normalizedEmail,
                username: normalizedUsername,
                isEmailVerified: false,
                goalTypeId: input.goalTypeId,
            },
        });

        // Create profile
        await tx.userProfile.create({
            data: {
                userId: user.id,
                firstName: input.profile.firstName,
                lastName: input.profile.lastName,
                birthDate: input.profile.birthDate,
                gender: input.profile.gender,
            },
        });

        // Create body info
        await tx.userBody.create({
            data: {
                userId: user.id,
                heightCm: input.body.heightCm,
                weightKg: input.body.weightKg,
                targetWeightKg: input.body.targetWeightKg,
            },
        });

        // Create settings
        await tx.userSetting.create({
            data: {
                userId: user.id,
                preferredUnit: input.settings.preferredUnit,
                preferredLanguage: input.settings.preferredLanguage,
                theme: input.settings.theme,
            },
        });

        // Create local credential
        await tx.userLocalCredential.create({
            data: {
                userId: user.id,
                passwordHash,
            },
        });

        // Create body targets
        if (input.bodyTargetIds.length > 0) {
            await tx.userBodyTarget.createMany({
                data: input.bodyTargetIds.map((bodyTargetId) => ({
                    userId: user.id,
                    bodyTargetId,
                })),
            });
        }

        // Create health limitations
        if (input.healthLimitationIds && input.healthLimitationIds.length > 0) {
            await tx.userHealthLimitation.createMany({
                data: input.healthLimitationIds.map((healthLimitationId) => ({
                    userId: user.id,
                    healthLimitationId,
                })),
            });
        }

        // Create equipment
        if (input.equipmentIds.length > 0) {
            await tx.userEquipment.createMany({
                data: input.equipmentIds.map((equipmentId) => ({
                    userId: user.id,
                    equipmentId,
                })),
            });
        }

        // Create workout locations
        if (input.workoutLocationIds.length > 0) {
            await tx.userWorkoutLocation.createMany({
                data: input.workoutLocationIds.map((workoutLocationId) => ({
                    userId: user.id,
                    workoutLocationId,
                })),
            });
        }

        // Create device
        const device = await tx.userDevice.create({
            data: {
                userId: user.id,
                deviceId: input.device.deviceId,
                deviceName: input.device.deviceName,
                deviceType: input.device.deviceType,
                fcmToken: input.device.fcmToken,
            },
        });

        // Create verification token
        await tx.emailVerificationToken.create({
            data: {
                userId: user.id,
                codeHash: verificationCodeHash,
                expiresAt: calculateExpiry(VERIFICATION_CODE_EXPIRY_MINUTES),
                attemptsLeft: MAX_VERIFICATION_ATTEMPTS,
                sentCount: 1,
            },
        });

        // Generate tokens
        const tokenId = device.id;
        const tokens = generateTokenPair(user.id, device.id, tokenId);

        // Store refresh token
        await tx.refreshToken.create({
            data: {
                userId: user.id,
                deviceId: device.id,
                tokenHash: hashRefreshToken(tokens.refreshToken),
                expiresAt: tokens.expiresAt,
            },
        });

        return { user, device, tokens };
    });

    // Send verification email (outside transaction)
    await sendVerificationCode(
        normalizedEmail,
        verificationCode,
        input.profile.firstName
    );

    authLogger.registerSuccess(result.user.id, normalizedEmail);

    return {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            isEmailVerified: result.user.isEmailVerified,
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

    // Check for existing verified user with this email
    const existingVerifiedUser = await prisma.user.findFirst({
        where: {
            email: normalizedEmail,
            isEmailVerified: true,
            deletedAt: null,
        },
    });

    if (existingVerifiedUser) {
        // Check if this social account is already linked
        const existingLink = await prisma.userExternalLogin.findUnique({
            where: {
                provider_providerKey: {
                    provider: socialData.provider,
                    providerKey: socialData.providerKey,
                },
            },
        });

        if (existingLink) {
            throw new AppError(
                ErrorCodes.EMAIL_ALREADY_EXISTS,
                'This social account is already linked to another user',
                409
            );
        }

        // Email exists, need to handle merge scenario
        throw new AppError(
            ErrorCodes.ACCOUNT_MERGE_REQUIRED,
            'An account with this email already exists. Would you like to link your social account?',
            409,
            { existingUserId: existingVerifiedUser.id, requiresMerge: true }
        );
    }

    // Check username
    const existingUsername = await prisma.user.findUnique({
        where: { username: normalizedUsername },
    });

    if (existingUsername) {
        throw new AppError(ErrorCodes.USERNAME_TAKEN, 'Username is already taken', 409);
    }

    // Atomic registration
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Delete any existing unverified user with this email
        await tx.user.deleteMany({
            where: {
                email: normalizedEmail,
                isEmailVerified: false,
            },
        });

        // Create user (email verified via social)
        const user = await tx.user.create({
            data: {
                email: normalizedEmail,
                username: normalizedUsername,
                isEmailVerified: true, // Social auth = verified
                goalTypeId: input.goalTypeId,
            },
        });

        // Create profile
        await tx.userProfile.create({
            data: {
                userId: user.id,
                firstName: input.profile.firstName,
                lastName: input.profile.lastName,
                birthDate: input.profile.birthDate,
                gender: input.profile.gender,
            },
        });

        // Create body
        await tx.userBody.create({
            data: {
                userId: user.id,
                heightCm: input.body.heightCm,
                weightKg: input.body.weightKg,
                targetWeightKg: input.body.targetWeightKg,
            },
        });

        // Create settings
        await tx.userSetting.create({
            data: {
                userId: user.id,
                preferredUnit: input.settings.preferredUnit,
                preferredLanguage: input.settings.preferredLanguage,
                theme: input.settings.theme,
            },
        });

        // Create external login
        await tx.userExternalLogin.create({
            data: {
                userId: user.id,
                provider: socialData.provider,
                providerKey: socialData.providerKey,
            },
        });

        // Create junction records
        if (input.bodyTargetIds.length > 0) {
            await tx.userBodyTarget.createMany({
                data: input.bodyTargetIds.map((id) => ({ userId: user.id, bodyTargetId: id })),
            });
        }

        if (input.healthLimitationIds && input.healthLimitationIds.length > 0) {
            await tx.userHealthLimitation.createMany({
                data: input.healthLimitationIds.map((id) => ({ userId: user.id, healthLimitationId: id })),
            });
        }

        if (input.equipmentIds.length > 0) {
            await tx.userEquipment.createMany({
                data: input.equipmentIds.map((id) => ({ userId: user.id, equipmentId: id })),
            });
        }

        if (input.workoutLocationIds.length > 0) {
            await tx.userWorkoutLocation.createMany({
                data: input.workoutLocationIds.map((id) => ({ userId: user.id, workoutLocationId: id })),
            });
        }

        // Create device
        const device = await tx.userDevice.create({
            data: {
                userId: user.id,
                deviceId: input.device.deviceId,
                deviceName: input.device.deviceName,
                deviceType: input.device.deviceType,
                fcmToken: input.device.fcmToken,
            },
        });

        // Generate tokens
        const tokens = generateTokenPair(user.id, device.id, device.id);

        await tx.refreshToken.create({
            data: {
                userId: user.id,
                deviceId: device.id,
                tokenHash: hashRefreshToken(tokens.refreshToken),
                expiresAt: tokens.expiresAt,
            },
        });

        return { user, device, tokens };
    });

    // Send welcome email
    await sendWelcomeEmail(normalizedEmail, input.profile.firstName);

    authLogger.registerSuccess(result.user.id, normalizedEmail);

    return {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            isEmailVerified: result.user.isEmailVerified,
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

    // Find user with credentials
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
            localCredential: true,
            profile: true,
        },
    });

    if (!user || user.deletedAt) {
        authLogger.loginFailed(normalizedEmail, 'User not found');
        throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    if (!user.localCredential) {
        authLogger.loginFailed(normalizedEmail, 'No local credential');
        throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Check if account is locked
    if (user.localCredential.lockedUntil && new Date() < user.localCredential.lockedUntil) {
        const waitMinutes = Math.ceil(
            (user.localCredential.lockedUntil.getTime() - Date.now()) / 60000
        );
        throw new AppError(
            ErrorCodes.RATE_LIMIT_EXCEEDED,
            `Account temporarily locked. Try again in ${waitMinutes} minutes`,
            429
        );
    }

    // Verify password
    const isValidPassword = await comparePassword(input.password, user.localCredential.passwordHash);

    if (!isValidPassword) {
        // Increment failed attempts
        const newAttempts = user.localCredential.failedAttempts + 1;
        const shouldLock = newAttempts >= 5;

        await prisma.userLocalCredential.update({
            where: { id: user.localCredential.id },
            data: {
                failedAttempts: newAttempts,
                lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
            },
        });

        authLogger.loginFailed(normalizedEmail, 'Invalid password');
        throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Reset failed attempts on successful login
    await prisma.userLocalCredential.update({
        where: { id: user.localCredential.id },
        data: { failedAttempts: 0, lockedUntil: null },
    });

    // Check email verification
    if (!user.isEmailVerified) {
        // Generate new verification code
        const code = generateVerificationCode();
        await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
        await prisma.emailVerificationToken.create({
            data: {
                userId: user.id,
                codeHash: hashToken(code),
                expiresAt: calculateExpiry(VERIFICATION_CODE_EXPIRY_MINUTES),
                attemptsLeft: MAX_VERIFICATION_ATTEMPTS,
            },
        });
        await sendVerificationCode(user.email, code, user.profile?.firstName);

        throw new AppError(
            ErrorCodes.EMAIL_NOT_VERIFIED,
            'Please verify your email. A new verification code has been sent.',
            403,
            { requiresVerification: true }
        );
    }

    // Handle device (create or update, enforce limit)
    const device = await deviceService.registerOrUpdateDevice(user.id, input.device);

    // Generate tokens
    const tokens = generateTokenPair(user.id, device.id, device.id);

    // Store refresh token (delete old ones for this device first)
    await prisma.refreshToken.deleteMany({
        where: { deviceId: device.id },
    });

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            deviceId: device.id,
            tokenHash: hashRefreshToken(tokens.refreshToken),
            expiresAt: tokens.expiresAt,
        },
    });

    authLogger.loginSuccess(user.id, device.id, 'local');

    return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            isEmailVerified: user.isEmailVerified,
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

    // Find existing external login
    const existingLogin = await prisma.userExternalLogin.findUnique({
        where: {
            provider_providerKey: {
                provider: socialData.provider,
                providerKey: socialData.providerKey,
            },
        },
        include: {
            user: {
                include: { profile: true },
            },
        },
    });

    if (existingLogin && !existingLogin.user.deletedAt) {
        // Existing user, proceed with login
        const user = existingLogin.user;

        const device = await deviceService.registerOrUpdateDevice(user.id, input.device);
        const tokens = generateTokenPair(user.id, device.id, device.id);

        await prisma.refreshToken.deleteMany({ where: { deviceId: device.id } });
        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                deviceId: device.id,
                tokenHash: hashRefreshToken(tokens.refreshToken),
                expiresAt: tokens.expiresAt,
            },
        });

        authLogger.loginSuccess(user.id, device.id, socialData.provider);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isEmailVerified: user.isEmailVerified,
            },
        };
    }

    // Check if user with this email exists
    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { profile: true },
    });

    if (existingUser && !existingUser.deletedAt) {
        if (existingUser.isEmailVerified) {
            // Verified user exists - ask for merge confirmation
            return {
                requiresMerge: true,
                email: normalizedEmail,
            };
        } else {
            // Unverified user - merge automatically and verify
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                await tx.user.update({
                    where: { id: existingUser.id },
                    data: { isEmailVerified: true },
                });

                await tx.userExternalLogin.create({
                    data: {
                        userId: existingUser.id,
                        provider: socialData.provider,
                        providerKey: socialData.providerKey,
                    },
                });
            });

            const device = await deviceService.registerOrUpdateDevice(existingUser.id, input.device);
            const tokens = generateTokenPair(existingUser.id, device.id, device.id);

            await prisma.refreshToken.deleteMany({ where: { deviceId: device.id } });
            await prisma.refreshToken.create({
                data: {
                    userId: existingUser.id,
                    deviceId: device.id,
                    tokenHash: hashRefreshToken(tokens.refreshToken),
                    expiresAt: tokens.expiresAt,
                },
            });

            authLogger.loginSuccess(existingUser.id, device.id, socialData.provider);

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    username: existingUser.username,
                    isEmailVerified: true,
                },
            };
        }
    }

    // No user found - this is a social registration, not login
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
        where: { id: userId },
    });

    if (!user || user.deletedAt) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    // Create external login
    await prisma.userExternalLogin.create({
        data: {
            userId: user.id,
            provider: socialData.provider,
            providerKey: socialData.providerKey,
        },
    });

    // Handle device and tokens
    const userDevice = await deviceService.registerOrUpdateDevice(user.id, device);
    const tokens = generateTokenPair(user.id, userDevice.id, userDevice.id);

    await prisma.refreshToken.deleteMany({ where: { deviceId: userDevice.id } });
    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            deviceId: userDevice.id,
            tokenHash: hashRefreshToken(tokens.refreshToken),
            expiresAt: tokens.expiresAt,
        },
    });

    logger.info('Social account merged', {
        userId: user.id,
        provider: socialData.provider,
        action: 'ACCOUNT_MERGED',
    });

    return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            isEmailVerified: user.isEmailVerified,
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
        where: { id: userId },
        include: { emailVerificationTokens: true },
    });

    if (!user) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    if (user.isEmailVerified) {
        return; // Already verified
    }

    const token = user.emailVerificationTokens[0];

    if (!token) {
        throw new AppError(
            ErrorCodes.VERIFICATION_CODE_EXPIRED,
            'No verification code found. Please request a new one.',
            410
        );
    }

    if (isExpired(token.expiresAt)) {
        throw new AppError(
            ErrorCodes.VERIFICATION_CODE_EXPIRED,
            'Verification code has expired. Please request a new one.',
            410
        );
    }

    if (token.attemptsLeft <= 0) {
        throw new AppError(
            ErrorCodes.MAX_VERIFICATION_ATTEMPTS,
            'Maximum attempts exceeded. Please request a new code.',
            429
        );
    }

    const codeHash = hashToken(code);

    if (codeHash !== token.codeHash) {
        // Decrement attempts
        await prisma.emailVerificationToken.update({
            where: { id: token.id },
            data: { attemptsLeft: token.attemptsLeft - 1 },
        });

        throw new AppError(
            ErrorCodes.VERIFICATION_CODE_INVALID,
            `Invalid code. ${token.attemptsLeft - 1} attempts remaining.`,
            400
        );
    }

    // Verify user and delete token
    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { isEmailVerified: true },
        }),
        prisma.emailVerificationToken.deleteMany({
            where: { userId },
        }),
    ]);

    authLogger.emailVerified(userId);

    // Send welcome email
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (profile) {
        await sendWelcomeEmail(user.email, profile.firstName);
    }
};

/**
 * Resend verification code
 */
export const resendVerificationCode = async (userId: string): Promise<{ cooldownSeconds: number }> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            emailVerificationTokens: true,
            profile: true,
        },
    });

    if (!user) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    if (user.isEmailVerified) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Email is already verified', 400);
    }

    const existingToken = user.emailVerificationTokens[0];

    if (existingToken) {
        // Check cooldown (progressive: 60s, 120s, 180s...)
        const cooldownSeconds = RESEND_COOLDOWN_BASE_SECONDS * existingToken.sentCount;
        const cooldownEnd = new Date(existingToken.lastSentAt.getTime() + cooldownSeconds * 1000);

        if (new Date() < cooldownEnd) {
            const remainingSeconds = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
            throw new AppError(
                ErrorCodes.VERIFICATION_RESEND_COOLDOWN,
                `Please wait ${remainingSeconds} seconds before requesting a new code`,
                429,
                { cooldownSeconds: remainingSeconds }
            );
        }

        // Check daily limit
        if (existingToken.sentCount >= MAX_DAILY_VERIFICATION_SENDS) {
            throw new AppError(
                ErrorCodes.MAX_DAILY_VERIFICATIONS,
                'Maximum daily verification emails reached. Please try again tomorrow.',
                429
            );
        }

        // Generate new code
        const newCode = generateVerificationCode();

        await prisma.emailVerificationToken.update({
            where: { id: existingToken.id },
            data: {
                codeHash: hashToken(newCode),
                expiresAt: calculateExpiry(VERIFICATION_CODE_EXPIRY_MINUTES),
                attemptsLeft: MAX_VERIFICATION_ATTEMPTS,
                sentCount: existingToken.sentCount + 1,
                lastSentAt: new Date(),
            },
        });

        await sendVerificationCode(user.email, newCode, user.profile?.firstName);

        const nextCooldown = RESEND_COOLDOWN_BASE_SECONDS * (existingToken.sentCount + 1);
        return { cooldownSeconds: nextCooldown };
    }

    // No existing token, create new one
    const newCode = generateVerificationCode();

    await prisma.emailVerificationToken.create({
        data: {
            userId,
            codeHash: hashToken(newCode),
            expiresAt: calculateExpiry(VERIFICATION_CODE_EXPIRY_MINUTES),
            attemptsLeft: MAX_VERIFICATION_ATTEMPTS,
            sentCount: 1,
        },
    });

    await sendVerificationCode(user.email, newCode, user.profile?.firstName);

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
        include: { profile: true, localCredential: true },
    });

    // Always return success to prevent email enumeration
    if (!user || user.deletedAt || !user.localCredential) {
        return;
    }

    // Generate reset token
    const resetToken = generateSecureToken();
    const tokenHash = hashToken(resetToken);

    // Delete old reset tokens
    await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
    });

    // Create new token
    await prisma.passwordResetToken.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt: calculateExpiry(PASSWORD_RESET_EXPIRY_MINUTES),
        },
    });

    // Send email
    await sendPasswordResetEmail(user.email, resetToken, user.profile?.firstName);

    authLogger.passwordResetRequested(user.email);
};

/**
 * Reset password with token
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    const tokenHash = hashToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true },
    });

    if (!resetToken) {
        throw new AppError(ErrorCodes.PASSWORD_RESET_EXPIRED, 'Invalid or expired reset link', 410);
    }

    if (resetToken.isUsed) {
        throw new AppError(ErrorCodes.PASSWORD_RESET_USED, 'This reset link has already been used', 410);
    }

    if (isExpired(resetToken.expiresAt)) {
        throw new AppError(ErrorCodes.PASSWORD_RESET_EXPIRED, 'Reset link has expired', 410);
    }

    // Validate new password
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
        throw new AppError(ErrorCodes.PASSWORD_TOO_WEAK, validation.errors.join(', '), 400);
    }

    const passwordHash = await hashPassword(newPassword);

    // Update password and invalidate all sessions
    await prisma.$transaction([
        prisma.userLocalCredential.update({
            where: { userId: resetToken.userId },
            data: { passwordHash, lastPasswordChangeAt: new Date(), failedAttempts: 0, lockedUntil: null },
        }),
        prisma.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { isUsed: true },
        }),
        prisma.refreshToken.deleteMany({
            where: { userId: resetToken.userId },
        }),
    ]);

    authLogger.passwordChanged(resetToken.userId);
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
        where: { userId },
    });

    if (!credential) {
        throw new AppError(
            ErrorCodes.VALIDATION_ERROR,
            'No password set for this account. Use social login.',
            400
        );
    }

    const isValid = await comparePassword(currentPassword, credential.passwordHash);
    if (!isValid) {
        throw new AppError(ErrorCodes.INCORRECT_PASSWORD, 'Current password is incorrect', 401);
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
        throw new AppError(ErrorCodes.PASSWORD_TOO_WEAK, validation.errors.join(', '), 400);
    }

    const passwordHash = await hashPassword(newPassword);

    // Update password and invalidate all sessions
    await prisma.$transaction([
        prisma.userLocalCredential.update({
            where: { userId },
            data: { passwordHash, lastPasswordChangeAt: new Date() },
        }),
        prisma.refreshToken.deleteMany({
            where: { userId },
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

    // Find the stored token
    const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
    });

    if (!storedToken) {
        // Token not found - possible theft, invalidate all user tokens
        authLogger.suspiciousActivity(userId, 'Refresh token reuse detected');
        await prisma.refreshToken.deleteMany({ where: { userId } });
        throw new AppError(ErrorCodes.TOKEN_INVALID, 'Invalid refresh token', 401);
    }

    if (storedToken.user.deletedAt) {
        throw new AppError(ErrorCodes.USER_DELETED, 'User account has been deleted', 401);
    }

    // Generate new tokens
    const newTokens = generateTokenPair(userId, deviceId, tokenId);

    // Replace old token with new one (rotation)
    await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
            tokenHash: hashRefreshToken(newTokens.refreshToken),
            expiresAt: newTokens.expiresAt,
        },
    });

    // Update device activity
    await prisma.userDevice.update({
        where: { id: deviceId },
        data: { lastActiveAt: new Date() },
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
        where: { userId, deviceId },
    });

    authLogger.logoutSuccess(userId, deviceId);
};

/**
 * Logout from all devices
 */
export const logoutAllDevices = async (userId: string): Promise<void> => {
    await prisma.refreshToken.deleteMany({
        where: { userId },
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
    // Check if already linked
    const existingLink = await prisma.userExternalLogin.findFirst({
        where: { userId, provider },
    });

    if (existingLink) {
        throw new AppError(
            ErrorCodes.ACCOUNT_ALREADY_LINKED,
            `A ${provider} account is already linked`,
            409
        );
    }

    // Check if this social account is linked to another user
    const otherUserLink = await prisma.userExternalLogin.findUnique({
        where: {
            provider_providerKey: { provider, providerKey },
        },
    });

    if (otherUserLink) {
        throw new AppError(
            ErrorCodes.ACCOUNT_ALREADY_LINKED,
            'This social account is already linked to another user',
            409
        );
    }

    await prisma.userExternalLogin.create({
        data: { userId, provider, providerKey },
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
    // Check how many auth methods user has
    const [localCred, externalLogins] = await Promise.all([
        prisma.userLocalCredential.findUnique({ where: { userId } }),
        prisma.userExternalLogin.findMany({ where: { userId } }),
    ]);

    const hasLocalAuth = !!localCred;
    const socialCount = externalLogins.length;

    // Can't remove if it's the only auth method
    if (!hasLocalAuth && socialCount <= 1) {
        throw new AppError(
            ErrorCodes.CANNOT_REMOVE_LAST_AUTH,
            'Cannot remove the last authentication method. Add a password or another social account first.',
            400
        );
    }

    const toRemove = externalLogins.find((el: { id: string; provider: string }) => el.provider === provider);
    if (!toRemove) {
        throw new AppError(ErrorCodes.NOT_FOUND, `No ${provider} account linked`, 404);
    }

    await prisma.userExternalLogin.delete({
        where: { id: toRemove.id },
    });

    logger.info('Social account unlinked', { userId, provider, action: 'SOCIAL_UNLINKED' });
};
