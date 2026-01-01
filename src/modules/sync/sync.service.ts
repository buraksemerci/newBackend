import { prisma } from '../../config/index.js';

export interface StaticDataVersions {
    languages: number;
    muscles: number;
    equipment: number;
    exercises: number;
    movementPatterns: number;
    fitnessGoals: number;
    bodyTargets: number;
    healthLimitations: number;
    experienceLevels: number;
    attributes: number;
}

/**
 * Get current versions for all static data types
 * Version is based on count + last update timestamp hash
 */
export const getStaticDataVersions = async (): Promise<StaticDataVersions> => {
    // For simplicity, we use count as version
    // In production, you'd track actual version numbers in a separate table
    const [
        languages,
        muscles,
        equipment,
        exercises,
        movementPatterns,
        fitnessGoals,
        bodyTargets,
        healthLimitations,
        experienceLevels,
        attributes,
    ] = await Promise.all([
        prisma.language.count(),
        prisma.muscle.count(),
        prisma.equipment.count(),
        prisma.exercise.count(),
        prisma.movementPattern.count(),
        prisma.fitnessGoal.count(),
        prisma.bodyTarget.count(),
        prisma.healthLimitation.count(),
        prisma.experienceLevel.count(),
        prisma.attribute.count(),
    ]);

    return {
        languages,
        muscles,
        equipment,
        exercises,
        movementPatterns,
        fitnessGoals,
        bodyTargets,
        healthLimitations,
        experienceLevels,
        attributes,
    };
};

/**
 * Get all static data for initial sync
 */
export const getAllStaticData = async (languageId: number = 1) => {
    const [
        languages,
        muscles,
        muscleTranslations,
        muscleSubgroups,
        muscleSubgroupRelations,
        equipment,
        equipmentTranslations,
        movementPatterns,
        movementPatternTranslations,
        exercises,
        exerciseTranslations,
        exerciseTargetMuscles,
        exerciseEquipment,
        exerciseMedia,
        exerciseLimitations,
        fitnessGoals,
        fitnessGoalTranslations,
        bodyTargets,
        bodyTargetTranslations,
        healthLimitations,
        healthLimitationTranslations,
        experienceLevels,
        attributes,
        fitnessGoalAttributes,
        exerciseAttributes,
    ] = await Promise.all([
        // Languages
        prisma.language.findMany({ where: { is_active: true } }),

        // Muscles
        prisma.muscle.findMany(),
        prisma.muscleTranslation.findMany({ where: { language_id: languageId } }),
        prisma.muscleSubgroup.findMany(),
        prisma.muscleSubgroupRelation.findMany(),

        // Equipment
        prisma.equipment.findMany(),
        prisma.equipmentTranslation.findMany({ where: { language_id: languageId } }),

        // Movement Patterns
        prisma.movementPattern.findMany(),
        prisma.movementPatternTranslation.findMany({ where: { language_id: languageId } }),

        // Exercises
        prisma.exercise.findMany(),
        prisma.exerciseTranslation.findMany({ where: { language_id: languageId } }),
        prisma.exerciseTargetMuscle.findMany(),
        prisma.exerciseEquipment.findMany(),
        prisma.exerciseMedia.findMany(),
        prisma.exerciseLimitation.findMany(),

        // Fitness Goals
        prisma.fitnessGoal.findMany(),
        prisma.fitnessGoalTranslation.findMany({ where: { language_id: languageId } }),

        // Body Targets
        prisma.bodyTarget.findMany(),
        prisma.bodyTargetTranslation.findMany({ where: { language_id: languageId } }),

        // Health Limitations
        prisma.healthLimitation.findMany(),
        prisma.healthLimitationTranslation.findMany({ where: { language_id: languageId } }),

        // Experience Levels
        prisma.experienceLevel.findMany(),

        // Attributes
        prisma.attribute.findMany(),
        prisma.fitnessGoalAttribute.findMany(),
        prisma.exerciseAttributeRelation.findMany(),
    ]);

    return {
        languages: languages.map(l => ({
            languageId: l.language_id,
            languageCode: l.language_code,
            languageName: l.language_name,
            isActive: l.is_active,
        })),
        muscles: muscles.map(m => ({
            muscleId: m.muscle_id,
            muscleKey: m.muscle_key,
        })),
        muscleTranslations: muscleTranslations.map(t => ({
            muscleId: t.muscle_id,
            languageId: t.language_id,
            name: t.name,
        })),
        muscleSubgroups: muscleSubgroups.map(s => ({
            muscleSubgroupId: s.muscle_subgroup_id,
            muscleSubgroupKey: s.muscle_subgroup_key,
        })),
        muscleSubgroupRelations: muscleSubgroupRelations.map(r => ({
            muscleId: r.muscle_id,
            muscleSubgroupId: r.muscle_subgroup_id,
        })),
        equipment: equipment.map(e => ({
            equipmentId: e.equipment_id,
            equipmentKey: e.equipment_key,
        })),
        equipmentTranslations: equipmentTranslations.map(t => ({
            equipmentId: t.equipment_id,
            languageId: t.language_id,
            name: t.name,
        })),
        movementPatterns: movementPatterns.map(p => ({
            movementPatternId: p.movement_pattern_id,
            movementPatternKey: p.movement_pattern_key,
        })),
        movementPatternTranslations: movementPatternTranslations.map(t => ({
            movementPatternId: t.movement_pattern_id,
            languageId: t.language_id,
            name: t.name,
        })),
        exercises: exercises.map(e => ({
            exerciseId: e.exercise_id,
            exerciseKey: e.exercise_key,
            movementPatternId: e.movement_pattern_id,
            exerciseExperienceLevel: Number(e.exercise_experience_level),
            metValue: e.met_value ? Number(e.met_value) : null,
            compoundLevel: e.compound_level,
        })),
        exerciseTranslations: exerciseTranslations.map(t => ({
            exerciseId: t.exercise_id,
            languageId: t.language_id,
            name: t.name,
            description: t.description,
        })),
        exerciseTargetMuscles: exerciseTargetMuscles.map(m => ({
            exerciseId: m.exercise_id,
            muscleId: m.muscle_id,
            effectOnMuscle: m.effect_on_muscle,
        })),
        exerciseEquipment: exerciseEquipment.map(e => ({
            exerciseId: e.exercise_id,
            equipmentId: e.equipment_id,
        })),
        exerciseMedia: exerciseMedia.map(m => ({
            exerciseMediaId: m.exercise_media_id,
            exerciseId: m.exercise_id,
            mediaType: m.media_type,
            mediaUrl: m.media_url,
            thumbnailUrl: m.thumbnail_url,
        })),
        exerciseLimitations: exerciseLimitations.map(l => ({
            exerciseId: l.exercise_id,
            healthLimitationId: l.health_limitation_id,
            maxSeverityAllowed: l.max_severity_allowed,
        })),
        fitnessGoals: fitnessGoals.map(g => ({
            fitnessGoalId: g.fitness_goal_id,
            fitnessGoalKey: g.fitness_goal_key,
            defaultSetDurationSeconds: g.default_set_duration_seconds,
            defaultRestDurationSeconds: g.default_rest_duration_seconds,
        })),
        fitnessGoalTranslations: fitnessGoalTranslations.map(t => ({
            fitnessGoalId: t.fitness_goal_id,
            languageId: t.language_id,
            name: t.name,
        })),
        bodyTargets: bodyTargets.map(b => ({
            bodyTargetId: b.body_target_id,
            muscleSubgroupId: b.muscle_subgroup_id,
            targetGender: b.target_gender,
        })),
        bodyTargetTranslations: bodyTargetTranslations.map(t => ({
            bodyTargetId: t.body_target_id,
            languageId: t.language_id,
            name: t.name,
        })),
        healthLimitations: healthLimitations.map(h => ({
            healthLimitationId: h.health_limitation_id,
            healthLimitationKey: h.health_limitation_key,
        })),
        healthLimitationTranslations: healthLimitationTranslations.map(t => ({
            healthLimitationId: t.health_limitation_id,
            languageId: t.language_id,
            name: t.name,
            description: t.description,
        })),
        experienceLevels: experienceLevels.map(e => ({
            experienceLevelId: e.experience_level_id,
            experienceLevelKey: e.experience_level_key,
        })),
        attributes: attributes.map(a => ({
            attributeId: a.attribute_id,
            attributeKey: a.attribute_key,
        })),
        fitnessGoalAttributes: fitnessGoalAttributes.map(a => ({
            fitnessGoalId: a.fitness_goal_id,
            attributeId: a.attribute_id,
            weightOnAttribute: a.weight_on_attribute,
        })),
        exerciseAttributes: exerciseAttributes.map(a => ({
            exerciseId: a.exercise_id,
            attributeId: a.attribute_id,
            exerciseAttributeLevel: a.exercise_attribute_level,
        })),
    };
};
