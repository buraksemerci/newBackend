import { prisma } from '../../config/database.js';
import { Gender } from '../../types/index.js';
import {
    LocalizedFitnessGoal,
    LocalizedBodyTarget,
    LocalizedHealthLimitation,
    LocalizedEquipment,
    LocalizedWorkoutLocation,
} from '../../types/index.js';

const DEFAULT_LANGUAGE = 'en';

/**
 * Get all fitness goals with translation
 */
export const getFitnessGoals = async (languageCode: string = DEFAULT_LANGUAGE): Promise<LocalizedFitnessGoal[]> => {
    const fitnessGoals = await prisma.fitnessGoal.findMany({
        include: {
            translations: {
                where: {
                    language: { code: languageCode },
                },
                include: { language: true },
            },
        },
    });

    // If no translation found, fallback to default language
    const result: LocalizedFitnessGoal[] = [];

    for (const fitnessGoal of fitnessGoals) {
        let name = fitnessGoal.key; // Fallback to key

        if (fitnessGoal.translations.length > 0) {
            name = fitnessGoal.translations[0].name;
        } else if (languageCode !== DEFAULT_LANGUAGE) {
            // Try to get default language translation
            const defaultTranslation = await prisma.fitnessGoalTranslation.findFirst({
                where: {
                    fitnessGoalId: fitnessGoal.id,
                    language: { code: DEFAULT_LANGUAGE },
                },
            });
            if (defaultTranslation) {
                name = defaultTranslation.name;
            }
        }

        result.push({
            id: fitnessGoal.id,
            key: fitnessGoal.key,
            name,
        });
    }

    return result;
};

/**
 * Get body targets filtered by gender with translation
 */
export const getBodyTargets = async (
    gender: Gender,
    languageCode: string = DEFAULT_LANGUAGE
): Promise<LocalizedBodyTarget[]> => {
    const bodyTargets = await prisma.bodyTarget.findMany({
        where: { targetGender: gender },
        include: {
            translations: {
                where: {
                    language: { code: languageCode },
                },
            },
        },
    });

    const result: LocalizedBodyTarget[] = [];

    for (const bodyTarget of bodyTargets) {
        let name = bodyTarget.key;

        if (bodyTarget.translations.length > 0) {
            name = bodyTarget.translations[0].name;
        } else if (languageCode !== DEFAULT_LANGUAGE) {
            const defaultTranslation = await prisma.bodyTargetTranslation.findFirst({
                where: {
                    bodyTargetId: bodyTarget.id,
                    language: { code: DEFAULT_LANGUAGE },
                },
            });
            if (defaultTranslation) {
                name = defaultTranslation.name;
            }
        }

        result.push({
            id: bodyTarget.id,
            key: bodyTarget.key,
            name,
            targetGender: bodyTarget.targetGender as Gender,
        });
    }

    return result;
};

/**
 * Get all health limitations with translation
 */
export const getHealthLimitations = async (
    languageCode: string = DEFAULT_LANGUAGE
): Promise<LocalizedHealthLimitation[]> => {
    const limitations = await prisma.healthLimitation.findMany({
        include: {
            translations: {
                where: {
                    language: { code: languageCode },
                },
            },
        },
    });

    const result: LocalizedHealthLimitation[] = [];

    for (const limitation of limitations) {
        let name = limitation.key;
        let description: string | undefined;

        if (limitation.translations.length > 0) {
            name = limitation.translations[0].name;
            description = limitation.translations[0].description || undefined;
        } else if (languageCode !== DEFAULT_LANGUAGE) {
            const defaultTranslation = await prisma.healthLimitationTranslation.findFirst({
                where: {
                    healthLimitationId: limitation.id,
                    language: { code: DEFAULT_LANGUAGE },
                },
            });
            if (defaultTranslation) {
                name = defaultTranslation.name;
                description = defaultTranslation.description || undefined;
            }
        }

        result.push({
            id: limitation.id,
            key: limitation.key,
            name,
            description,
        });
    }

    return result;
};

/**
 * Get all equipment with translation
 */
export const getEquipment = async (
    languageCode: string = DEFAULT_LANGUAGE
): Promise<LocalizedEquipment[]> => {
    const equipment = await prisma.equipment.findMany({
        include: {
            translations: {
                where: {
                    language: { code: languageCode },
                },
            },
        },
        orderBy: [
            { isDefault: 'desc' }, // Default equipment first
            { key: 'asc' },
        ],
    });

    const result: LocalizedEquipment[] = [];

    for (const item of equipment) {
        let name = item.key;

        if (item.translations.length > 0) {
            name = item.translations[0].name;
        } else if (languageCode !== DEFAULT_LANGUAGE) {
            const defaultTranslation = await prisma.equipmentTranslation.findFirst({
                where: {
                    equipmentId: item.id,
                    language: { code: DEFAULT_LANGUAGE },
                },
            });
            if (defaultTranslation) {
                name = defaultTranslation.name;
            }
        }

        result.push({
            id: item.id,
            key: item.key,
            name,
            isDefault: item.isDefault,
        });
    }

    return result;
};

/**
 * Get all workout locations with translation
 */
export const getWorkoutLocations = async (
    languageCode: string = DEFAULT_LANGUAGE
): Promise<LocalizedWorkoutLocation[]> => {
    const locations = await prisma.workoutLocation.findMany({
        include: {
            translations: {
                where: {
                    language: { code: languageCode },
                },
            },
        },
    });

    const result: LocalizedWorkoutLocation[] = [];

    for (const location of locations) {
        let name = location.key;

        if (location.translations.length > 0) {
            name = location.translations[0].name;
        } else if (languageCode !== DEFAULT_LANGUAGE) {
            const defaultTranslation = await prisma.workoutLocationTranslation.findFirst({
                where: {
                    workoutLocationId: location.id,
                    language: { code: DEFAULT_LANGUAGE },
                },
            });
            if (defaultTranslation) {
                name = defaultTranslation.name;
            }
        }

        result.push({
            id: location.id,
            key: location.key,
            name,
        });
    }

    return result;
};

/**
 * Check if a username is available
 */
export const checkUsernameAvailability = async (username: string): Promise<{
    available: boolean;
    message?: string;
}> => {
    // Check format
    const usernameRegex = /^[a-z0-9_]{8,16}$/;
    if (!usernameRegex.test(username)) {
        return {
            available: false,
            message: 'Username must be 8-16 characters and contain only lowercase letters, numbers, and underscores',
        };
    }

    // Check if taken
    const existingUser = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
    });

    if (existingUser) {
        return {
            available: false,
            message: 'Username is already taken',
        };
    }

    return { available: true };
};

/**
 * Check if an email is available
 */
export const checkEmailAvailability = async (email: string): Promise<{
    available: boolean;
    message?: string;
}> => {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if taken by a verified user
    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, isEmailVerified: true },
    });

    if (existingUser && existingUser.isEmailVerified) {
        return {
            available: false,
            message: 'Email is already registered',
        };
    }

    // If there's an unverified user, the email is still available
    // (the unverified account will be replaced on new registration)
    return { available: true };
};

/**
 * Get available languages
 */
export const getLanguages = async (): Promise<{ id: number; code: string; name: string }[]> => {
    const languages = await prisma.language.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
    });

    return languages;
};
