import { prisma, logger } from '../../config/index.js';
import { AppError } from '../../middleware/error.middleware.js';
import { ErrorCodes } from '../../utils/response.util.js';
import { UserFullInfo, Unit, Theme, Gender } from '../../types/index.js';
import crypto from 'crypto';

const USERNAME_CHANGE_COOLDOWN_DAYS = 15;

/**
 * Get current user with full info
 */
export const getCurrentUser = async (userId: string): Promise<UserFullInfo> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            profile: true,
            body: true,
            settings: true,
            goals: {
                include: {
                    fitnessGoal: { select: { id: true, key: true } },
                    bodyTargets: {
                        include: { bodyTarget: { select: { id: true, key: true } } },
                    },
                },
            },
            externalLogins: {
                select: { provider: true },
            },
            localCredential: {
                select: { id: true },
            },
        },
    });

    if (!user || user.deletedAt) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
        profile: user.profile
            ? {
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                birthDate: user.profile.birthDate,
                gender: user.profile.gender as Gender,
            }
            : null,
        body: user.body
            ? {
                heightCm: Number(user.body.heightCm),
                weightKg: Number(user.body.weightKg),
                targetWeightKg: user.body.targetWeightKg ? Number(user.body.targetWeightKg) : null,
                somatotype: user.body.somatotype,
            }
            : null,
        goals: user.goals
            ? {
                fitnessGoal: user.goals.fitnessGoal ? { id: user.goals.fitnessGoal.id, key: user.goals.fitnessGoal.key } : null,
                bodyTargets: user.goals.bodyTargets.map((bt) => ({ id: bt.bodyTarget.id, key: bt.bodyTarget.key })),
            }
            : null,
        settings: user.settings
            ? {
                preferredUnit: user.settings.preferredUnit as Unit,
                languageId: user.settings.languageId,
                theme: user.settings.theme as Theme,
                workoutReminders: user.settings.workoutReminders,
                progressUpdates: user.settings.progressUpdates,
            }
            : null,
    };
};

/**
 * Update user profile
 */
export const updateProfile = async (
    userId: string,
    data: {
        firstName?: string;
        lastName?: string;
        birthDate?: Date;
        gender?: Gender;
    }
): Promise<void> => {
    // Validate age if birthDate is provided
    if (data.birthDate) {
        const age = Math.floor((Date.now() - data.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 13 || age > 85) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Age must be between 13 and 85', 400);
        }
    }

    await prisma.userProfile.update({
        where: { userId },
        data,
    });

    logger.info('Profile updated', { userId, action: 'PROFILE_UPDATED' });
};

/**
 * Update user body info
 */
export const updateBody = async (
    userId: string,
    data: {
        heightCm?: number;
        weightKg?: number;
        targetWeightKg?: number;
        somatotype?: string;
    }
): Promise<void> => {
    await prisma.userBody.update({
        where: { userId },
        data,
    });

    logger.info('Body info updated', { userId, action: 'BODY_UPDATED' });
};

/**
 * Update user settings
 */
export const updateSettings = async (
    userId: string,
    data: {
        preferredUnit?: Unit;
        languageId?: number;
        theme?: Theme;
        workoutReminders?: boolean;
        progressUpdates?: boolean;
    }
): Promise<void> => {
    await prisma.userSetting.update({
        where: { userId },
        data,
    });

    logger.info('Settings updated', { userId, action: 'SETTINGS_UPDATED' });
};

/**
 * Change username (with 15-day cooldown)
 */
export const changeUsername = async (userId: string, newUsername: string): Promise<void> => {
    const normalizedUsername = newUsername.toLowerCase();

    // Validate format
    const usernameRegex = /^[a-z0-9_]{8,16}$/;
    if (!usernameRegex.test(normalizedUsername)) {
        throw new AppError(
            ErrorCodes.VALIDATION_ERROR,
            'Username must be 8-16 characters and contain only lowercase letters, numbers, and underscores',
            400
        );
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, usernameLastChangedAt: true },
    });

    if (!user) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    // Check cooldown
    if (user.usernameLastChangedAt) {
        const cooldownEnd = new Date(
            user.usernameLastChangedAt.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
        );

        if (new Date() < cooldownEnd) {
            const daysRemaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            throw new AppError(
                ErrorCodes.USERNAME_CHANGE_COOLDOWN,
                `You can change your username again in ${daysRemaining} days`,
                429
            );
        }
    }

    // Check if username is taken
    const existingUser = await prisma.user.findUnique({
        where: { username: normalizedUsername },
    });

    if (existingUser && existingUser.id !== userId) {
        throw new AppError(ErrorCodes.USERNAME_TAKEN, 'Username is already taken', 409);
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            username: normalizedUsername,
            usernameLastChangedAt: new Date(),
        },
    });

    logger.info('Username changed', { userId, newUsername: normalizedUsername, action: 'USERNAME_CHANGED' });
};

/**
 * Update user fitness goal
 */
export const updateFitnessGoal = async (userId: string, fitnessGoalId: number): Promise<void> => {
    // Verify fitness goal exists
    const fitnessGoal = await prisma.fitnessGoal.findUnique({
        where: { id: fitnessGoalId },
    });

    if (!fitnessGoal) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Fitness goal not found', 404);
    }

    await prisma.userGoals.update({
        where: { userId },
        data: { fitnessGoalId },
    });

    logger.info('Fitness goal updated', { userId, fitnessGoalId, action: 'FITNESS_GOAL_UPDATED' });
};

/**
 * Get user's linked auth methods
 */
export const getAuthMethods = async (
    userId: string
): Promise<{
    hasPassword: boolean;
    socialAccounts: string[];
}> => {
    const [localCred, externalLogins] = await Promise.all([
        prisma.userLocalCredential.findUnique({ where: { userId } }),
        prisma.userExternalLogin.findMany({
            where: { userId },
            select: { provider: true },
        }),
    ]);

    return {
        hasPassword: !!localCred,
        socialAccounts: externalLogins.map((el: { provider: string }) => el.provider),
    };
};

/**
 * Delete user account (soft delete with anonymization)
 */
export const deleteAccount = async (userId: string): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
    });

    if (!user || user.deletedAt) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    const now = new Date();
    const anonymizedEmail = crypto.createHash('sha256').update(user.email).digest('hex') + '@deleted.user';
    const anonymizedUsername = `deleted_user_${crypto.randomBytes(8).toString('hex')}`;

    await prisma.$transaction([
        // Anonymize user
        prisma.user.update({
            where: { id: userId },
            data: {
                email: anonymizedEmail,
                username: anonymizedUsername,
                deletedAt: now,
            },
        }),

        // Anonymize profile
        prisma.userProfile.update({
            where: { userId },
            data: {
                firstName: 'Deleted',
                lastName: 'User',
            },
        }),

        // Delete all tokens
        prisma.refreshToken.deleteMany({ where: { userId } }),
        prisma.verificationToken.deleteMany({ where: { userId } }),

        // Delete credentials
        prisma.userLocalCredential.deleteMany({ where: { userId } }),
        prisma.userExternalLogin.deleteMany({ where: { userId } }),

        // Delete devices
        prisma.userDevice.deleteMany({ where: { userId } }),
    ]);

    logger.info('User account deleted (soft)', { userId, action: 'ACCOUNT_DELETED' });
};
