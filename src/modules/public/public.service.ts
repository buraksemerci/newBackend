import { prisma } from '../../config/database.js';
import { Gender } from '../../types/index.js';
import {
    LocalizedGoalType,
    LocalizedBodyTarget,
    LocalizedHealthLimitation,
    LocalizedEquipment,
    LocalizedWorkoutLocation,
} from '../../types/index.js';

const DEFAULT_LANGUAGE = 'en';

/**
 * Get all goal types with localization
 */
export const getGoalTypes = async (languageCode: string = DEFAULT_LANGUAGE): Promise<LocalizedGoalType[]> => {
    const goalTypes = await prisma.goalType.findMany({
        include: {
            localizations: {
                where: {
                    language: { code: languageCode },
                },
                include: { language: true },
            },
        },
    });

    // If no localization found, fallback to default language
    const result: LocalizedGoalType[] = [];

    for (const goalType of goalTypes) {
        let name = goalType.key; // Fallback to key

        if (goalType.localizations.length > 0) {
            name = goalType.localizations[0].name;
        } else if (languageCode !== DEFAULT_LANGUAGE) {
            // Try to get default language localization
            const defaultLocalization = await prisma.goalTypeLocalization.findFirst({
                where: {
                    goalTypeId: goalType.id,
                    language: { code: DEFAULT_LANGUAGE },
                },
            });
            if (defaultLocalization) {
                name = defaultLocalization.name;
            }
        }

        result.push({
            id: goalType.id,
            key: goalType.key,
            name,
        });
    }

    return result;
};

/**
 * Get body targets filtered by gender with localization
 */
export const getBodyTargets = async (
    gender: Gender,
    languageCode: string = DEFAULT_LANGUAGE
): Promise<LocalizedBodyTarget[]> => {
    const bodyTargets = await prisma.bodyTarget.findMany({
        where: { targetGender: gender },
        include: {
            localizations: {
                where: {
                    language: { code: languageCode },
                },
            },
        },
    });

    const result: LocalizedBodyTarget[] = [];

    for (const bodyTarget of bodyTargets) {
        let name = bodyTarget.key;

        if (bodyTarget.localizations.length > 0) {
            name = bodyTarget.localizations[0].name;
        } else if (languageCode !== DEFAULT_LANGUAGE) {
            const defaultLocalization = await prisma.bodyTargetLocalization.findFirst({
                where: {
                    bodyTargetId: bodyTarget.id,
                    language: { code: DEFAULT_LANGUAGE },
                },
            });
            if (defaultLocalization) {
                name = defaultLocalization.name;
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
 * Get all health limitations with localization
 */
export const getHealthLimitations = async (
    languageCode: string = DEFAULT_LANGUAGE
): Promise<LocalizedHealthLimitation[]> => {
    const limitations = await prisma.healthLimitation.findMany({
        include: {
            localizations: {
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

        if (limitation.localizations.length > 0) {
            name = limitation.localizations[0].name;
            description = limitation.localizations[0].description || undefined;
        } else if (languageCode !== DEFAULT_LANGUAGE) {
            const defaultLocalization = await prisma.healthLimitationLocalization.findFirst({
                where: {
                    healthLimitationId: limitation.id,
                    language: { code: DEFAULT_LANGUAGE },
                },
            });
            if (defaultLocalization) {
                name = defaultLocalization.name;
                description = defaultLocalization.description || undefined;
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
 * Get all equipment with localization
 */
export const getEquipment = async (
    languageCode: string = DEFAULT_LANGUAGE
): Promise<LocalizedEquipment[]> => {
    const equipment = await prisma.equipment.findMany({
        include: {
            localizations: {
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

        if (item.localizations.length > 0) {
            name = item.localizations[0].name;
        } else if (languageCode !== DEFAULT_LANGUAGE) {
            const defaultLocalization = await prisma.equipmentLocalization.findFirst({
                where: {
                    equipmentId: item.id,
                    language: { code: DEFAULT_LANGUAGE },
                },
            });
            if (defaultLocalization) {
                name = defaultLocalization.name;
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
 * Get all workout locations with localization
 */
export const getWorkoutLocations = async (
    languageCode: string = DEFAULT_LANGUAGE
): Promise<LocalizedWorkoutLocation[]> => {
    const locations = await prisma.workoutLocation.findMany({
        include: {
            localizations: {
                where: {
                    language: { code: languageCode },
                },
            },
        },
    });

    const result: LocalizedWorkoutLocation[] = [];

    for (const location of locations) {
        let name = location.key;

        if (location.localizations.length > 0) {
            name = location.localizations[0].name;
        } else if (languageCode !== DEFAULT_LANGUAGE) {
            const defaultLocalization = await prisma.workoutLocationLocalization.findFirst({
                where: {
                    workoutLocationId: location.id,
                    language: { code: DEFAULT_LANGUAGE },
                },
            });
            if (defaultLocalization) {
                name = defaultLocalization.name;
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
export const getLanguages = async (): Promise<{ code: string; name: string }[]> => {
    const languages = await prisma.language.findMany({
        where: { isActive: true },
        select: { code: true, name: true },
        orderBy: { code: 'asc' },
    });

    return languages;
};
