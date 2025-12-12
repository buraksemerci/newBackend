import { prisma, logger } from '../../config/index.js';
import { AppError } from '../../middleware/error.middleware.js';
import { ErrorCodes } from '../../utils/response.util.js';
import { UserFullInfo, Unit, Theme, Gender } from '../../types/index.js';
import crypto from 'crypto';
import * as connectionService from '../connection/connection.service.js';

const USERNAME_CHANGE_COOLDOWN_DAYS = 15;

/**
 * Get current user with full info
 */
export const getCurrentUser = async (userId: string): Promise<UserFullInfo> => {
    const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: {
            profile: true,
            body: true,
            settings: true,
            goals: {
                include: {
                    fitness_goal: { select: { fitness_goal_id: true, fitness_goal_key: true } },
                },
            },
            user_body_targets: { // Updated relation
                include: { body_target: { select: { body_target_id: true, body_target_key: true } } },
            },
            external_logins: {
                select: { provider: true },
            },
            local_credential: {
                select: { user_local_credential_id: true },
            },
        },
    });

    if (!user || user.deleted_at) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    return {
        id: user.user_id,
        email: user.email,
        username: user.username,
        isEmailVerified: user.is_email_verified,
        profile: user.profile
            ? {
                firstName: user.profile.first_name,
                lastName: user.profile.last_name,
                birthDate: user.profile.birth_date,
                gender: user.profile.gender as Gender,
            }
            : null,
        body: user.body
            ? {
                heightCm: Number(user.body.height_cm),
                weightKg: Number(user.body.weight_kg),
                targetWeightKg: user.body.target_weight_kg ? Number(user.body.target_weight_kg) : null,
                somatotype: user.body.somatotype,
            }
            : null,
        goals: user.goals
            ? {
                fitnessGoal: user.goals.fitness_goal
                    ? { id: user.goals.fitness_goal.fitness_goal_id, key: user.goals.fitness_goal.fitness_goal_key }
                    : null,
                bodyTargets: user.user_body_targets.map((bt) => ({ // Updated mapping
                    id: bt.body_target.body_target_id,
                    key: bt.body_target.body_target_key
                })),
            }
            : null,
        settings: user.settings
            ? {
                preferredUnit: user.settings.preferred_unit as Unit,
                languageId: user.settings.language_id,
                theme: user.settings.theme as Theme,
                workoutReminders: user.settings.workout_reminders,
                progressUpdates: user.settings.progress_updates,
            }
            : null,
        externalLogins: user.external_logins.map((login) => ({
            provider: login.provider,
        })),
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
        where: { user_id: userId },
        data: {
            first_name: data.firstName,
            last_name: data.lastName,
            birth_date: data.birthDate,
            gender: data.gender,
        },
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
        where: { user_id: userId },
        data: {
            height_cm: data.heightCm,
            weight_kg: data.weightKg,
            target_weight_kg: data.targetWeightKg,
            somatotype: data.somatotype,
        },
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
        where: { user_id: userId },
        data: {
            preferred_unit: data.preferredUnit,
            language_id: data.languageId,
            theme: data.theme,
            workout_reminders: data.workoutReminders,
            progress_updates: data.progressUpdates,
        },
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
        where: { user_id: userId },
        select: { username: true, username_last_changed_at: true },
    });

    if (!user) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    // Check cooldown
    if (user.username_last_changed_at) {
        const cooldownEnd = new Date(
            user.username_last_changed_at.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
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

    if (existingUser && existingUser.user_id !== userId) {
        throw new AppError(ErrorCodes.USERNAME_TAKEN, 'Username is already taken', 409);
    }

    await prisma.user.update({
        where: { user_id: userId },
        data: {
            username: normalizedUsername,
            username_last_changed_at: new Date(),
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
        where: { fitness_goal_id: fitnessGoalId },
    });

    if (!fitnessGoal) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Fitness goal not found', 404);
    }

    await prisma.userGoals.update({
        where: { user_id: userId },
        data: { fitness_goal_id: fitnessGoalId },
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
        prisma.userLocalCredential.findUnique({ where: { user_id: userId } }),
        prisma.userExternalLogin.findMany({
            where: { user_id: userId },
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
        where: { user_id: userId },
        include: { profile: true },
    });

    if (!user || user.deleted_at) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    const now = new Date();
    const anonymizedEmail = crypto.createHash('sha256').update(user.email).digest('hex') + '@deleted.user';
    // Username must be max 16 chars: 'del_' (4) + 6 hex chars (12 total, leaving room for edge cases)
    const anonymizedUsername = `del_${crypto.randomBytes(6).toString('hex').slice(0, 12)}`;

    // Proactive Cleanup: Remove all social connections before soft delete
    await connectionService.cleanupUserConnections(userId);

    await prisma.$transaction([
        // Anonymize user
        prisma.user.update({
            where: { user_id: userId },
            data: {
                email: anonymizedEmail,
                username: anonymizedUsername,
                deleted_at: now,
            },
        }),

        // Anonymize profile
        prisma.userProfile.update({
            where: { user_id: userId },
            data: {
                first_name: 'Deleted',
                last_name: 'User',
            },
        }),

        // Delete all tokens
        prisma.refreshToken.deleteMany({ where: { user_id: userId } }),
        prisma.verificationToken.deleteMany({ where: { user_id: userId } }),

        // Delete credentials
        prisma.userLocalCredential.deleteMany({ where: { user_id: userId } }),
        prisma.userExternalLogin.deleteMany({ where: { user_id: userId } }),

        // Delete devices
        prisma.userDevice.deleteMany({ where: { user_id: userId } }),
    ]);

    logger.info('User account deleted (soft)', { userId, action: 'ACCOUNT_DELETED' });
};
