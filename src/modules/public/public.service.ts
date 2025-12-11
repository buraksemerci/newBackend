import { prisma } from '../../config/database.js';
import { Gender } from '../../types/index.js';
import {
    LocalizedFitnessGoal,
    LocalizedBodyTarget,
    LocalizedHealthLimitation,
    LocalizedEquipment,
    LocalizedExerciseCategory,
    LocalizedMovementPattern,
    LocalizedMuscle,
    LocalizedExercise,
} from '../../types/index.js';

const DEFAULT_LANGUAGE = 'en';

/**
 * Get all fitness goals with translation
 */
export const getFitnessGoals = async (languageCode: string = DEFAULT_LANGUAGE): Promise<LocalizedFitnessGoal[]> => {
    const fitnessGoals = await prisma.fitnessGoal.findMany({
        include: {
            translations: {
                where: { language: { language_code: languageCode } },
            },
        },
    });

    return fitnessGoals.map(goal => ({
        id: goal.fitness_goal_id,
        key: goal.fitness_goal_key,
        name: goal.translations[0]?.name ?? goal.fitness_goal_key,
    }));
};

/**
 * Get all body targets with translation (filtered by gender)
 */
export const getBodyTargets = async (
    gender: Gender,
    languageCode: string = DEFAULT_LANGUAGE
): Promise<LocalizedBodyTarget[]> => {
    const targetGender = gender === 'OTHER' ? 'MALE' : gender;

    const bodyTargets = await prisma.bodyTarget.findMany({
        where: { target_gender: targetGender },
        include: {
            translations: {
                where: { language: { language_code: languageCode } },
            },
        },
    });

    return bodyTargets.map(target => ({
        id: target.body_target_id,
        key: target.body_target_key,
        name: target.translations[0]?.name ?? target.body_target_key,
        targetGender: target.target_gender as Gender,
    }));
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
                where: { language: { language_code: languageCode } },
            },
        },
    });

    return limitations.map(limitation => ({
        id: limitation.health_limitation_id,
        key: limitation.health_limitation_key,
        name: limitation.translations[0]?.name ?? limitation.health_limitation_key,
        description: limitation.translations[0]?.description ?? undefined,
        severityLevel: limitation.base_severity,
    }));
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
                where: { language: { language_code: languageCode } },
            },
        },
    });

    return equipment.map(equip => ({
        id: equip.equipment_id,
        key: equip.equipment_key,
        name: equip.translations[0]?.name ?? equip.equipment_key,
        isDefault: equip.is_default,
    }));
};

/**
 * Check if a username is available
 */
export const checkUsernameAvailability = async (username: string): Promise<{
    available: boolean;
    message?: string;
}> => {
    const usernameRegex = /^[a-z0-9_]{8,16}$/;
    if (!usernameRegex.test(username)) {
        return {
            available: false,
            message: 'Username must be 8-16 characters and contain only lowercase letters, numbers, and underscores',
        };
    }

    const existingUser = await prisma.user.findUnique({
        where: { username },
        select: { user_id: true },
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

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { user_id: true, is_email_verified: true },
    });

    if (existingUser && existingUser.is_email_verified) {
        return {
            available: false,
            message: 'Email is already registered',
        };
    }

    return { available: true };
};

/**
 * Get available languages
 */
export const getLanguages = async (): Promise<{ id: number; code: string; name: string }[]> => {
    const languages = await prisma.language.findMany({
        where: { is_active: true },
        select: { language_id: true, language_code: true, language_name: true },
        orderBy: { language_code: 'asc' },
    });

    return languages.map(lang => ({
        id: lang.language_id,
        code: lang.language_code,
        name: lang.language_name,
    }));
};

/**
 * Get all exercise categories with translation
 */
export const getExerciseCategories = async (languageCode: string = DEFAULT_LANGUAGE): Promise<LocalizedExerciseCategory[]> => {
    const categories = await prisma.exerciseCategory.findMany({
        include: {
            translations: {
                where: { language: { language_code: languageCode } },
            },
        },
        orderBy: { exercise_category_key: 'asc' },
    });

    return categories.map(cat => ({
        id: cat.exercise_category_id,
        key: cat.exercise_category_key,
        name: cat.translations[0]?.name ?? cat.exercise_category_key,
    }));
};

/**
 * Get all movement patterns with translation
 */
export const getMovementPatterns = async (languageCode: string = DEFAULT_LANGUAGE): Promise<LocalizedMovementPattern[]> => {
    const patterns = await prisma.movementPattern.findMany({
        include: {
            translations: {
                where: { language: { language_code: languageCode } },
            },
        },
        orderBy: { movement_pattern_key: 'asc' },
    });

    return patterns.map(pat => ({
        id: pat.movement_pattern_id,
        key: pat.movement_pattern_key,
        name: pat.translations[0]?.name ?? pat.movement_pattern_key,
    }));
};

/**
 * Get all muscles with translation
 */
export const getMuscles = async (languageCode: string = DEFAULT_LANGUAGE): Promise<LocalizedMuscle[]> => {
    const muscles = await prisma.muscle.findMany({
        include: {
            translations: {
                where: { language: { language_code: languageCode } },
            },
        },
        orderBy: [{ muscle_group: 'asc' }, { muscle_subgroup: 'asc' }, { muscle_key: 'asc' }],
    });

    return muscles.map(m => ({
        id: m.muscle_id,
        key: m.muscle_key,
        name: m.translations[0]?.name ?? m.muscle_key,
        muscleGroup: m.muscle_group,
        muscleSubgroup: m.muscle_subgroup,
    }));
};

/**
 * Get all exercises with relations
 */
export const getExercises = async (languageCode: string = DEFAULT_LANGUAGE): Promise<LocalizedExercise[]> => {
    const exercises = await prisma.exercise.findMany({
        include: {
            translations: { where: { language: { language_code: languageCode } } },
            exercise_category: {
                include: { translations: { where: { language: { language_code: languageCode } } } },
            },
            movement_pattern: {
                include: { translations: { where: { language: { language_code: languageCode } } } },
            },
            exercise_target_muscles: {
                include: {
                    muscle: {
                        include: { translations: { where: { language: { language_code: languageCode } } } },
                    },
                },
                orderBy: { contribution_level: 'desc' },
            },
            exercise_equipment: {
                include: {
                    equipment: {
                        include: { translations: { where: { language: { language_code: languageCode } } } },
                    },
                },
            },
            exercise_attributes: true,
        },
        orderBy: { exercise_key: 'asc' },
    });

    return exercises.map(ex => ({
        id: ex.exercise_id,
        key: ex.exercise_key,
        name: ex.translations[0]?.name ?? ex.exercise_key,
        description: ex.translations[0]?.description ?? undefined,
        category: {
            id: ex.exercise_category.exercise_category_id,
            key: ex.exercise_category.exercise_category_key,
            name: ex.exercise_category.translations[0]?.name ?? ex.exercise_category.exercise_category_key,
        },
        movementPattern: {
            id: ex.movement_pattern.movement_pattern_id,
            key: ex.movement_pattern.movement_pattern_key,
            name: ex.movement_pattern.translations[0]?.name ?? ex.movement_pattern.movement_pattern_key,
        },
        isCompound: ex.is_compound,
        experienceLevel: ex.experience_level,
        effectivenessScore: ex.effectiveness_score,
        metValue: ex.met_value ? Number(ex.met_value) : undefined,
        recoveryTimeHours: ex.recovery_time_hours,
        targetMuscles: ex.exercise_target_muscles.map(tm => ({
            id: tm.muscle.muscle_id,
            name: tm.muscle.translations[0]?.name ?? tm.muscle.muscle_key,
            contributionLevel: tm.contribution_level,
        })),
        equipment: ex.exercise_equipment.map(ee => ({
            id: ee.equipment.equipment_id,
            key: ee.equipment.equipment_key,
            name: ee.equipment.translations[0]?.name ?? ee.equipment.equipment_key,
            isDefault: ee.equipment.is_default,
        })),
        attributes: ex.exercise_attributes.map(attr => attr.attribute_key),
    }));
};
