import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // ============================================================================
    // LANGUAGES
    // ============================================================================
    const english = await prisma.language.upsert({
        where: { language_code: 'en' },
        update: {},
        create: { language_code: 'en', language_name: 'English', is_active: true },
    });

    const turkish = await prisma.language.upsert({
        where: { language_code: 'tr' },
        update: {},
        create: { language_code: 'tr', language_name: 'Türkçe', is_active: true },
    });
    console.log('✅ Languages seeded');

    // ============================================================================
    // EXPERIENCE LEVELS
    // ============================================================================
    const experienceLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    const experienceLevelMap: Record<string, number> = {};

    for (const key of experienceLevels) {
        const level = await prisma.experienceLevel.upsert({
            where: { experience_level_key: key },
            update: {},
            create: { experience_level_key: key },
        });
        experienceLevelMap[key] = level.experience_level_id;
    }
    console.log('✅ Experience levels seeded');

    // ============================================================================
    // MUSCLE SUBGROUPS
    // ============================================================================
    const muscleSubgroups = [
        { key: 'CHEST', group: 'UPPER' },
        { key: 'BACK', group: 'UPPER' },
        { key: 'SHOULDERS', group: 'UPPER' },
        { key: 'ARMS', group: 'UPPER' },
        { key: 'ABS', group: 'CORE' },
        { key: 'WAIST', group: 'CORE' },
        { key: 'LEGS', group: 'LOWER' },
        { key: 'GLUTES', group: 'LOWER' },
        { key: 'THIGHS', group: 'LOWER' },
    ];
    const muscleSubgroupMap: Record<string, number> = {};

    for (const sg of muscleSubgroups) {
        const subgroup = await prisma.muscleSubgroup.upsert({
            where: { muscle_subgroup_key: sg.key },
            update: { muscle_group: sg.group },
            create: { muscle_subgroup_key: sg.key, muscle_group: sg.group },
        });
        muscleSubgroupMap[sg.key] = subgroup.muscle_subgroup_id;
    }
    console.log('✅ Muscle subgroups seeded');

    // ============================================================================
    // BODY TARGETS (linked to muscle_subgroup via key lookup)
    // ============================================================================
    const bodyTargets = [
        { subgroupKey: 'CHEST', gender: 'MALE', en: 'Chest', tr: 'Göğüs' },
        { subgroupKey: 'BACK', gender: 'UNISEX', en: 'Back', tr: 'Sırt' },
        { subgroupKey: 'SHOULDERS', gender: 'MALE', en: 'Shoulders', tr: 'Omuzlar' },
        { subgroupKey: 'ARMS', gender: 'UNISEX', en: 'Arms', tr: 'Kollar' },
        { subgroupKey: 'ABS', gender: 'UNISEX', en: 'Abs', tr: 'Karın' },
        { subgroupKey: 'WAIST', gender: 'UNISEX', en: 'Waist', tr: 'Bel' },
        { subgroupKey: 'LEGS', gender: 'UNISEX', en: 'Legs', tr: 'Bacaklar' },
        { subgroupKey: 'GLUTES', gender: 'FEMALE', en: 'Glutes', tr: 'Kalça' },
        { subgroupKey: 'THIGHS', gender: 'FEMALE', en: 'Thighs', tr: 'Üst Bacak' },
    ];

    for (const bt of bodyTargets) {
        const subgroupId = muscleSubgroupMap[bt.subgroupKey];
        const bodyTarget = await prisma.bodyTarget.upsert({
            where: { muscle_subgroup_id_target_gender: { muscle_subgroup_id: subgroupId, target_gender: bt.gender } },
            update: {},
            create: { muscle_subgroup_id: subgroupId, target_gender: bt.gender },
        });

        await prisma.bodyTargetTranslation.upsert({
            where: { body_target_id_language_id: { body_target_id: bodyTarget.body_target_id, language_id: english.language_id } },
            update: { name: bt.en },
            create: { body_target_id: bodyTarget.body_target_id, language_id: english.language_id, name: bt.en },
        });

        await prisma.bodyTargetTranslation.upsert({
            where: { body_target_id_language_id: { body_target_id: bodyTarget.body_target_id, language_id: turkish.language_id } },
            update: { name: bt.tr },
            create: { body_target_id: bodyTarget.body_target_id, language_id: turkish.language_id, name: bt.tr },
        });
    }
    console.log('✅ Body targets seeded');

    // ============================================================================
    // FITNESS GOALS with duration fields
    // ============================================================================
    const fitnessGoals = [
        { key: 'LOSE_WEIGHT', setDur: 50, restDur: 30, en: 'Lose Weight', tr: 'Kilo Ver' },
        { key: 'MAINTAIN', setDur: 40, restDur: 45, en: 'Maintain', tr: 'Koruma' },
        { key: 'BUILD_MUSCLE', setDur: 35, restDur: 60, en: 'Build Muscle', tr: 'Kas Yap' },
        { key: 'BALANCED', setDur: 40, restDur: 45, en: 'Balanced', tr: 'Dengeli' },
    ];

    const fitnessGoalMap: Record<string, number> = {};
    for (const goal of fitnessGoals) {
        const fg = await prisma.fitnessGoal.upsert({
            where: { fitness_goal_key: goal.key },
            update: { default_set_duration_seconds: goal.setDur, default_rest_duration_seconds: goal.restDur },
            create: { fitness_goal_key: goal.key, default_set_duration_seconds: goal.setDur, default_rest_duration_seconds: goal.restDur },
        });
        fitnessGoalMap[goal.key] = fg.fitness_goal_id;

        await prisma.fitnessGoalTranslation.upsert({
            where: { fitness_goal_id_language_id: { fitness_goal_id: fg.fitness_goal_id, language_id: english.language_id } },
            update: { name: goal.en },
            create: { fitness_goal_id: fg.fitness_goal_id, language_id: english.language_id, name: goal.en },
        });

        await prisma.fitnessGoalTranslation.upsert({
            where: { fitness_goal_id_language_id: { fitness_goal_id: fg.fitness_goal_id, language_id: turkish.language_id } },
            update: { name: goal.tr },
            create: { fitness_goal_id: fg.fitness_goal_id, language_id: turkish.language_id, name: goal.tr },
        });
    }
    console.log('✅ Fitness goals seeded');

    // ============================================================================
    // ATTRIBUTES
    // ============================================================================
    const attributeKeys = ['HYPERTROPHY', 'CALORIE_BURN', 'AESTHETIC_SHAPING', 'STRENGTH_BASE'];
    const attributeMap: Record<string, number> = {};

    for (const key of attributeKeys) {
        const attr = await prisma.attribute.upsert({
            where: { attribute_key: key },
            update: {},
            create: { attribute_key: key },
        });
        attributeMap[key] = attr.attribute_id;
    }
    console.log('✅ Attributes seeded');

    // ============================================================================
    // FITNESS GOAL ATTRIBUTES (goal -> attribute -> weight)
    // ============================================================================
    const fitnessGoalAttributeData = [
        // LOSE_WEIGHT: HYPERTROPHY=5, CALORIE_BURN=10, AESTHETIC=10, STRENGTH=1
        { goalKey: 'LOSE_WEIGHT', attrKey: 'HYPERTROPHY', weight: 5 },
        { goalKey: 'LOSE_WEIGHT', attrKey: 'CALORIE_BURN', weight: 10 },
        { goalKey: 'LOSE_WEIGHT', attrKey: 'AESTHETIC_SHAPING', weight: 10 },
        { goalKey: 'LOSE_WEIGHT', attrKey: 'STRENGTH_BASE', weight: 1 },
        // MAINTAIN: all=5
        { goalKey: 'MAINTAIN', attrKey: 'HYPERTROPHY', weight: 5 },
        { goalKey: 'MAINTAIN', attrKey: 'CALORIE_BURN', weight: 5 },
        { goalKey: 'MAINTAIN', attrKey: 'AESTHETIC_SHAPING', weight: 5 },
        { goalKey: 'MAINTAIN', attrKey: 'STRENGTH_BASE', weight: 5 },
        // BUILD_MUSCLE: HYPERTROPHY=10, CALORIE=1, AESTHETIC=5, STRENGTH=10
        { goalKey: 'BUILD_MUSCLE', attrKey: 'HYPERTROPHY', weight: 10 },
        { goalKey: 'BUILD_MUSCLE', attrKey: 'CALORIE_BURN', weight: 1 },
        { goalKey: 'BUILD_MUSCLE', attrKey: 'AESTHETIC_SHAPING', weight: 5 },
        { goalKey: 'BUILD_MUSCLE', attrKey: 'STRENGTH_BASE', weight: 10 },
        // BALANCED: HYPERTROPHY=5, CALORIE=5, AESTHETIC=10, STRENGTH=5
        { goalKey: 'BALANCED', attrKey: 'HYPERTROPHY', weight: 5 },
        { goalKey: 'BALANCED', attrKey: 'CALORIE_BURN', weight: 5 },
        { goalKey: 'BALANCED', attrKey: 'AESTHETIC_SHAPING', weight: 10 },
        { goalKey: 'BALANCED', attrKey: 'STRENGTH_BASE', weight: 5 },
    ];

    for (const fga of fitnessGoalAttributeData) {
        const goalId = fitnessGoalMap[fga.goalKey];
        const attrId = attributeMap[fga.attrKey];
        await prisma.fitnessGoalAttribute.upsert({
            where: { fitness_goal_id_attribute_id: { fitness_goal_id: goalId, attribute_id: attrId } },
            update: { weight_on_attribute: fga.weight },
            create: { fitness_goal_id: goalId, attribute_id: attrId, weight_on_attribute: fga.weight },
        });
    }
    console.log('✅ Fitness goal attributes seeded');

    // ============================================================================
    // HEALTH LIMITATIONS
    // ============================================================================
    const healthLimitations = [
        { key: 'BACK_PAIN', en: 'Back Pain', tr: 'Bel Ağrısı', enDesc: 'Lower back issues', trDesc: 'Bel bölgesi sorunları' },
        { key: 'KNEE_PAIN', en: 'Knee Pain', tr: 'Diz Ağrısı', enDesc: 'Knee problems', trDesc: 'Diz problemleri' },
        { key: 'SHOULDER_PAIN', en: 'Shoulder Pain', tr: 'Omuz Ağrısı', enDesc: 'Shoulder issues', trDesc: 'Omuz sorunları' },
    ];
    const healthLimitationMap: Record<string, number> = {};

    for (const hl of healthLimitations) {
        const limitation = await prisma.healthLimitation.upsert({
            where: { health_limitation_key: hl.key },
            update: {},
            create: { health_limitation_key: hl.key },
        });
        healthLimitationMap[hl.key] = limitation.health_limitation_id;

        await prisma.healthLimitationTranslation.upsert({
            where: { health_limitation_id_language_id: { health_limitation_id: limitation.health_limitation_id, language_id: english.language_id } },
            update: { name: hl.en, description: hl.enDesc },
            create: { health_limitation_id: limitation.health_limitation_id, language_id: english.language_id, name: hl.en, description: hl.enDesc },
        });

        await prisma.healthLimitationTranslation.upsert({
            where: { health_limitation_id_language_id: { health_limitation_id: limitation.health_limitation_id, language_id: turkish.language_id } },
            update: { name: hl.tr, description: hl.trDesc },
            create: { health_limitation_id: limitation.health_limitation_id, language_id: turkish.language_id, name: hl.tr, description: hl.trDesc },
        });
    }
    console.log('✅ Health limitations seeded');

    // ============================================================================
    // EQUIPMENT
    // ============================================================================
    const equipmentData = [
        { key: 'BODYWEIGHT', en: 'Bodyweight', tr: 'Vücut Ağırlığı' },
        { key: 'DUMBBELL', en: 'Dumbbell', tr: 'Dambıl' },
        { key: 'BARBELL', en: 'Barbell', tr: 'Halter' },
        { key: 'KETTLEBELL', en: 'Kettlebell', tr: 'Kettlebell' },
        { key: 'RESISTANCE_BAND', en: 'Resistance Band', tr: 'Direnç Bandı' },
        { key: 'PULL_UP_BAR', en: 'Pull-up Bar', tr: 'Barfiks Çubuğu' },
        { key: 'BENCH', en: 'Bench', tr: 'Bank' },
    ];
    const equipmentMap: Record<string, number> = {};

    for (const eq of equipmentData) {
        const equip = await prisma.equipment.upsert({
            where: { equipment_key: eq.key },
            update: {},
            create: { equipment_key: eq.key },
        });
        equipmentMap[eq.key] = equip.equipment_id;

        await prisma.equipmentTranslation.upsert({
            where: { equipment_id_language_id: { equipment_id: equip.equipment_id, language_id: english.language_id } },
            update: { name: eq.en },
            create: { equipment_id: equip.equipment_id, language_id: english.language_id, name: eq.en },
        });

        await prisma.equipmentTranslation.upsert({
            where: { equipment_id_language_id: { equipment_id: equip.equipment_id, language_id: turkish.language_id } },
            update: { name: eq.tr },
            create: { equipment_id: equip.equipment_id, language_id: turkish.language_id, name: eq.tr },
        });
    }
    console.log('✅ Equipment seeded');

    // ============================================================================
    // MOVEMENT PATTERNS
    // ============================================================================
    const movementPatternData = [
        { key: 'PUSH', en: 'Push', tr: 'İtme' },
        { key: 'PULL', en: 'Pull', tr: 'Çekme' },
        { key: 'HINGE', en: 'Hinge', tr: 'Menteşe' },
        { key: 'SQUAT', en: 'Squat', tr: 'Çömelme' },
        { key: 'CARRY', en: 'Carry', tr: 'Taşıma' },
        { key: 'ROTATION', en: 'Rotation', tr: 'Rotasyon' },
    ];
    const movementPatternMap: Record<string, number> = {};

    for (const mp of movementPatternData) {
        const pattern = await prisma.movementPattern.upsert({
            where: { movement_pattern_key: mp.key },
            update: {},
            create: { movement_pattern_key: mp.key },
        });
        movementPatternMap[mp.key] = pattern.movement_pattern_id;

        await prisma.movementPatternTranslation.upsert({
            where: { movement_pattern_id_language_id: { movement_pattern_id: pattern.movement_pattern_id, language_id: english.language_id } },
            update: { name: mp.en },
            create: { movement_pattern_id: pattern.movement_pattern_id, language_id: english.language_id, name: mp.en },
        });

        await prisma.movementPatternTranslation.upsert({
            where: { movement_pattern_id_language_id: { movement_pattern_id: pattern.movement_pattern_id, language_id: turkish.language_id } },
            update: { name: mp.tr },
            create: { movement_pattern_id: pattern.movement_pattern_id, language_id: turkish.language_id, name: mp.tr },
        });
    }
    console.log('✅ Movement patterns seeded');

    // ============================================================================
    // MUSCLES
    // ============================================================================
    const muscleData = [
        { key: 'CHEST', en: 'Chest', tr: 'Göğüs' },
        { key: 'LATS', en: 'Lats', tr: 'Sırt Kasları' },
        { key: 'TRAPS', en: 'Traps', tr: 'Trapez' },
        { key: 'RHOMBOIDS', en: 'Rhomboids', tr: 'Eşkenar Dörtgen' },
        { key: 'FRONT_DELTOID', en: 'Front Deltoid', tr: 'Ön Omuz' },
        { key: 'SIDE_DELTOID', en: 'Side Deltoid', tr: 'Yan Omuz' },
        { key: 'REAR_DELTOID', en: 'Rear Deltoid', tr: 'Arka Omuz' },
        { key: 'BICEPS', en: 'Biceps', tr: 'Pazı' },
        { key: 'TRICEPS', en: 'Triceps', tr: 'Arka Kol' },
        { key: 'FOREARM', en: 'Forearm', tr: 'Ön Kol' },
        { key: 'ABS', en: 'Abs', tr: 'Karın' },
        { key: 'OBLIQUES', en: 'Obliques', tr: 'Yan Karın' },
        { key: 'LOWER_BACK', en: 'Lower Back', tr: 'Alt Sırt' },
        { key: 'CALVES', en: 'Calves', tr: 'Baldır' },
        { key: 'QUADRICEPS', en: 'Quadriceps', tr: 'Ön Bacak' },
        { key: 'HAMSTRINGS', en: 'Hamstrings', tr: 'Arka Bacak' },
        { key: 'GLUTES', en: 'Glutes', tr: 'Kalça' },
        { key: 'HIP_FLEXORS', en: 'Hip Flexors', tr: 'Kalça Fleksörleri' },
    ];
    const muscleMap: Record<string, number> = {};

    for (const m of muscleData) {
        const muscle = await prisma.muscle.upsert({
            where: { muscle_key: m.key },
            update: {},
            create: { muscle_key: m.key },
        });
        muscleMap[m.key] = muscle.muscle_id;

        await prisma.muscleTranslation.upsert({
            where: { muscle_id_language_id: { muscle_id: muscle.muscle_id, language_id: english.language_id } },
            update: { name: m.en },
            create: { muscle_id: muscle.muscle_id, language_id: english.language_id, name: m.en },
        });

        await prisma.muscleTranslation.upsert({
            where: { muscle_id_language_id: { muscle_id: muscle.muscle_id, language_id: turkish.language_id } },
            update: { name: m.tr },
            create: { muscle_id: muscle.muscle_id, language_id: turkish.language_id, name: m.tr },
        });
    }
    console.log('✅ Muscles seeded');

    // ============================================================================
    // MUSCLE SUBGROUP RELATIONS (using key lookups)
    // ============================================================================
    const muscleSubgroupRelationData = [
        { muscleKey: 'CHEST', subgroupKey: 'CHEST' },
        { muscleKey: 'LATS', subgroupKey: 'BACK' },
        { muscleKey: 'TRAPS', subgroupKey: 'BACK' }, { muscleKey: 'TRAPS', subgroupKey: 'SHOULDERS' },
        { muscleKey: 'RHOMBOIDS', subgroupKey: 'BACK' },
        { muscleKey: 'FRONT_DELTOID', subgroupKey: 'SHOULDERS' },
        { muscleKey: 'SIDE_DELTOID', subgroupKey: 'SHOULDERS' },
        { muscleKey: 'REAR_DELTOID', subgroupKey: 'SHOULDERS' }, { muscleKey: 'REAR_DELTOID', subgroupKey: 'BACK' },
        { muscleKey: 'BICEPS', subgroupKey: 'ARMS' },
        { muscleKey: 'TRICEPS', subgroupKey: 'ARMS' },
        { muscleKey: 'FOREARM', subgroupKey: 'ARMS' },
        { muscleKey: 'ABS', subgroupKey: 'ABS' },
        { muscleKey: 'OBLIQUES', subgroupKey: 'WAIST' }, { muscleKey: 'OBLIQUES', subgroupKey: 'ABS' },
        { muscleKey: 'LOWER_BACK', subgroupKey: 'WAIST' }, { muscleKey: 'LOWER_BACK', subgroupKey: 'BACK' },
        { muscleKey: 'CALVES', subgroupKey: 'LEGS' },
        { muscleKey: 'QUADRICEPS', subgroupKey: 'THIGHS' },
        { muscleKey: 'HAMSTRINGS', subgroupKey: 'THIGHS' },
        { muscleKey: 'GLUTES', subgroupKey: 'GLUTES' }, { muscleKey: 'GLUTES', subgroupKey: 'THIGHS' },
        { muscleKey: 'HIP_FLEXORS', subgroupKey: 'THIGHS' }, { muscleKey: 'HIP_FLEXORS', subgroupKey: 'WAIST' },
    ];

    for (const rel of muscleSubgroupRelationData) {
        const muscleId = muscleMap[rel.muscleKey];
        const subgroupId = muscleSubgroupMap[rel.subgroupKey];
        await prisma.muscleSubgroupRelation.upsert({
            where: { muscle_id_muscle_subgroup_id: { muscle_id: muscleId, muscle_subgroup_id: subgroupId } },
            update: {},
            create: { muscle_id: muscleId, muscle_subgroup_id: subgroupId },
        });
    }
    console.log('✅ Muscle subgroup relations seeded');

    // ============================================================================
    // EXERCISES (with detailed decimal experience levels 1.0-3.0)
    // ============================================================================
    const exerciseData = [
        // Bodyweight - easier exercises (1.0-1.5)
        { key: 'BW_PUSH_UP', patternKey: 'PUSH', expLevel: 1.2, metValue: 8, compound: 5, en: 'Push-Up', tr: 'Şınav' },
        { key: 'BW_SQUAT', patternKey: 'SQUAT', expLevel: 1.1, metValue: 5, compound: 5, en: 'Bodyweight Squat', tr: 'Vücut Ağırlığı Squat' },
        { key: 'BW_LUNGE', patternKey: 'SQUAT', expLevel: 1.3, metValue: 5, compound: 5, en: 'Lunge', tr: 'Lunge' },
        { key: 'PLANK', patternKey: 'ROTATION', expLevel: 1.0, metValue: 2.5, compound: 1, en: 'Plank', tr: 'Plank' },
        { key: 'CRUNCHES', patternKey: 'ROTATION', expLevel: 1.0, metValue: 3, compound: 1, en: 'Crunches', tr: 'Mekik' },
        { key: 'BW_RUSSIAN_TWIST', patternKey: 'ROTATION', expLevel: 1.2, metValue: 3.5, compound: 1, en: 'Russian Twist', tr: 'Rus Twist' },
        { key: 'GLUTE_BRIDGE', patternKey: 'HINGE', expLevel: 1.0, metValue: 3, compound: 1, en: 'Glute Bridge', tr: 'Kalça Köprüsü' },
        { key: 'BW_CALF_RAISE', patternKey: 'PUSH', expLevel: 1.0, metValue: 3, compound: 1, en: 'Calf Raise', tr: 'Baldır Kaldırma' },
        { key: 'SUPERMAN', patternKey: 'HINGE', expLevel: 1.1, metValue: 3, compound: 1, en: 'Superman', tr: 'Superman' },
        // Dumbbell - intermediate (1.5-2.2)
        { key: 'DB_BENCH_PRESS', patternKey: 'PUSH', expLevel: 1.6, metValue: 6, compound: 5, en: 'Dumbbell Bench Press', tr: 'Dambıl Bench Press' },
        { key: 'DB_SHOULDER_PRESS', patternKey: 'PUSH', expLevel: 1.6, metValue: 6, compound: 5, en: 'Dumbbell Shoulder Press', tr: 'Dambıl Omuz Press' },
        { key: 'DB_LATERAL_RAISE', patternKey: 'PUSH', expLevel: 1.4, metValue: 3, compound: 1, en: 'Lateral Raise', tr: 'Yan Kaldırma' },
        { key: 'DB_BICEP_CURL', patternKey: 'PULL', expLevel: 1.3, metValue: 3, compound: 1, en: 'Bicep Curl', tr: 'Biceps Curl' },
        { key: 'DB_TRICEP_EXTENSION', patternKey: 'PUSH', expLevel: 1.4, metValue: 3, compound: 1, en: 'Tricep Extension', tr: 'Triceps Ekstansiyon' },
        { key: 'DB_ROW', patternKey: 'PULL', expLevel: 1.5, metValue: 6, compound: 5, en: 'Dumbbell Row', tr: 'Dambıl Kürek Çekme' },
        { key: 'DB_GOBLET_SQUAT', patternKey: 'SQUAT', expLevel: 1.6, metValue: 6, compound: 5, en: 'Goblet Squat', tr: 'Goblet Squat' },
        { key: 'DB_STIFF_LEG_DEADLIFT', patternKey: 'HINGE', expLevel: 1.8, metValue: 6, compound: 5, en: 'Stiff Leg Deadlift', tr: 'Düz Bacak Deadlift' },
        // Barbell - advanced (2.0-2.8)
        { key: 'BB_BENCH_PRESS', patternKey: 'PUSH', expLevel: 2.1, metValue: 7, compound: 10, en: 'Barbell Bench Press', tr: 'Halter Bench Press' },
        { key: 'BB_SQUAT', patternKey: 'SQUAT', expLevel: 2.3, metValue: 8, compound: 10, en: 'Barbell Squat', tr: 'Halter Squat' },
        { key: 'BB_DEADLIFT', patternKey: 'HINGE', expLevel: 2.5, metValue: 9, compound: 10, en: 'Deadlift', tr: 'Deadlift' },
        { key: 'BB_OVERHEAD_PRESS', patternKey: 'PUSH', expLevel: 2.2, metValue: 6, compound: 10, en: 'Overhead Press', tr: 'Overhead Press' },
        { key: 'BB_BENT_OVER_ROW', patternKey: 'PULL', expLevel: 2.1, metValue: 7, compound: 10, en: 'Bent Over Row', tr: 'Eğilerek Kürek Çekme' },
        { key: 'BB_HIP_THRUST', patternKey: 'HINGE', expLevel: 1.9, metValue: 6, compound: 10, en: 'Hip Thrust', tr: 'Kalça İtme' },
        // Kettlebell (1.7-2.3)
        { key: 'KB_SWING', patternKey: 'HINGE', expLevel: 1.8, metValue: 8, compound: 10, en: 'Kettlebell Swing', tr: 'Kettlebell Salınım' },
        { key: 'KB_GOBLET_SQUAT', patternKey: 'SQUAT', expLevel: 1.7, metValue: 6, compound: 5, en: 'Kettlebell Goblet Squat', tr: 'Kettlebell Goblet Squat' },
        { key: 'KB_ONE_ARM_PRESS', patternKey: 'PUSH', expLevel: 1.9, metValue: 6, compound: 5, en: 'One Arm Press', tr: 'Tek Kol Press' },
        { key: 'KB_FARMERS_WALK', patternKey: 'CARRY', expLevel: 1.5, metValue: 5, compound: 10, en: 'Farmers Walk', tr: 'Çiftçi Yürüyüşü' },
        // Resistance band (1.3-1.8)
        { key: 'BAND_FACE_PULL', patternKey: 'PULL', expLevel: 1.4, metValue: 3, compound: 1, en: 'Face Pull', tr: 'Yüz Çekişi' },
        { key: 'BAND_PULL_APART', patternKey: 'PULL', expLevel: 1.2, metValue: 2.5, compound: 1, en: 'Band Pull Apart', tr: 'Bant Açma' },
        { key: 'BAND_CHEST_FLY', patternKey: 'PUSH', expLevel: 1.3, metValue: 3, compound: 1, en: 'Band Chest Fly', tr: 'Bant Göğüs Açma' },
        { key: 'BAND_WOODCHOP', patternKey: 'ROTATION', expLevel: 1.6, metValue: 3.5, compound: 5, en: 'Woodchop', tr: 'Odun Kesme' },
        // Pull-up bar (2.0-2.8)
        { key: 'PUB_CHIN_UP', patternKey: 'PULL', expLevel: 2.3, metValue: 8, compound: 5, en: 'Chin-Up', tr: 'Chin-Up' },
        { key: 'PUB_PULL_UP', patternKey: 'PULL', expLevel: 2.5, metValue: 8, compound: 10, en: 'Pull-Up', tr: 'Barfiks' },
        { key: 'PUB_HANGING_LEG_RAISE', patternKey: 'ROTATION', expLevel: 2.4, metValue: 4, compound: 1, en: 'Hanging Leg Raise', tr: 'Asılı Bacak Kaldırma' },
        // Bench exercises (1.4-2.0)
        { key: 'BENCH_DIPS', patternKey: 'PUSH', expLevel: 1.7, metValue: 4.5, compound: 5, en: 'Bench Dips', tr: 'Bank Dips' },
        { key: 'STEP_UP_ON_BENCH', patternKey: 'SQUAT', expLevel: 1.5, metValue: 5, compound: 5, en: 'Step Up', tr: 'Basamak Çıkma' },
    ];
    const exerciseMap: Record<string, number> = {};

    for (const ex of exerciseData) {
        const patternId = movementPatternMap[ex.patternKey];
        const exercise = await prisma.exercise.upsert({
            where: { exercise_key: ex.key },
            update: {
                movement_pattern_id: patternId,
                exercise_experience_level: ex.expLevel,
                met_value: ex.metValue,
                compound_level: ex.compound,
            },
            create: {
                exercise_key: ex.key,
                movement_pattern_id: patternId,
                exercise_experience_level: ex.expLevel,
                met_value: ex.metValue,
                compound_level: ex.compound,
            },
        });
        exerciseMap[ex.key] = exercise.exercise_id;

        // Create translations inline
        await prisma.exerciseTranslation.upsert({
            where: { exercise_id_language_id: { exercise_id: exercise.exercise_id, language_id: english.language_id } },
            update: { name: ex.en },
            create: { exercise_id: exercise.exercise_id, language_id: english.language_id, name: ex.en },
        });
        await prisma.exerciseTranslation.upsert({
            where: { exercise_id_language_id: { exercise_id: exercise.exercise_id, language_id: turkish.language_id } },
            update: { name: ex.tr },
            create: { exercise_id: exercise.exercise_id, language_id: turkish.language_id, name: ex.tr },
        });
    }
    console.log('✅ Exercises and translations seeded');

    // ============================================================================
    // EXERCISE TARGET MUSCLES (using key lookups)
    // ============================================================================
    const exerciseTargetMuscleData = [
        // Bodyweight
        { exKey: 'BW_PUSH_UP', muscleKey: 'CHEST', effect: 10 }, { exKey: 'BW_PUSH_UP', muscleKey: 'TRICEPS', effect: 5 }, { exKey: 'BW_PUSH_UP', muscleKey: 'FRONT_DELTOID', effect: 5 },
        { exKey: 'BW_SQUAT', muscleKey: 'QUADRICEPS', effect: 10 }, { exKey: 'BW_SQUAT', muscleKey: 'GLUTES', effect: 10 }, { exKey: 'BW_SQUAT', muscleKey: 'HAMSTRINGS', effect: 5 },
        { exKey: 'BW_LUNGE', muscleKey: 'QUADRICEPS', effect: 10 }, { exKey: 'BW_LUNGE', muscleKey: 'GLUTES', effect: 10 }, { exKey: 'BW_LUNGE', muscleKey: 'HAMSTRINGS', effect: 5 },
        { exKey: 'PLANK', muscleKey: 'ABS', effect: 10 }, { exKey: 'PLANK', muscleKey: 'OBLIQUES', effect: 5 },
        { exKey: 'CRUNCHES', muscleKey: 'ABS', effect: 10 },
        { exKey: 'BW_RUSSIAN_TWIST', muscleKey: 'OBLIQUES', effect: 10 }, { exKey: 'BW_RUSSIAN_TWIST', muscleKey: 'ABS', effect: 5 },
        { exKey: 'GLUTE_BRIDGE', muscleKey: 'GLUTES', effect: 10 }, { exKey: 'GLUTE_BRIDGE', muscleKey: 'HAMSTRINGS', effect: 5 },
        { exKey: 'BW_CALF_RAISE', muscleKey: 'CALVES', effect: 10 },
        { exKey: 'SUPERMAN', muscleKey: 'LOWER_BACK', effect: 10 }, { exKey: 'SUPERMAN', muscleKey: 'GLUTES', effect: 5 },
        // Dumbbell
        { exKey: 'DB_BENCH_PRESS', muscleKey: 'CHEST', effect: 10 }, { exKey: 'DB_BENCH_PRESS', muscleKey: 'TRICEPS', effect: 5 }, { exKey: 'DB_BENCH_PRESS', muscleKey: 'FRONT_DELTOID', effect: 5 },
        { exKey: 'DB_SHOULDER_PRESS', muscleKey: 'FRONT_DELTOID', effect: 10 }, { exKey: 'DB_SHOULDER_PRESS', muscleKey: 'SIDE_DELTOID', effect: 5 }, { exKey: 'DB_SHOULDER_PRESS', muscleKey: 'TRICEPS', effect: 5 },
        { exKey: 'DB_LATERAL_RAISE', muscleKey: 'SIDE_DELTOID', effect: 10 },
        { exKey: 'DB_BICEP_CURL', muscleKey: 'BICEPS', effect: 10 },
        { exKey: 'DB_TRICEP_EXTENSION', muscleKey: 'TRICEPS', effect: 10 },
        { exKey: 'DB_ROW', muscleKey: 'LATS', effect: 10 }, { exKey: 'DB_ROW', muscleKey: 'BICEPS', effect: 5 }, { exKey: 'DB_ROW', muscleKey: 'REAR_DELTOID', effect: 5 },
        { exKey: 'DB_GOBLET_SQUAT', muscleKey: 'QUADRICEPS', effect: 10 }, { exKey: 'DB_GOBLET_SQUAT', muscleKey: 'GLUTES', effect: 10 },
        { exKey: 'DB_STIFF_LEG_DEADLIFT', muscleKey: 'HAMSTRINGS', effect: 10 }, { exKey: 'DB_STIFF_LEG_DEADLIFT', muscleKey: 'GLUTES', effect: 10 }, { exKey: 'DB_STIFF_LEG_DEADLIFT', muscleKey: 'LOWER_BACK', effect: 5 },
        // Barbell
        { exKey: 'BB_BENCH_PRESS', muscleKey: 'CHEST', effect: 10 }, { exKey: 'BB_BENCH_PRESS', muscleKey: 'TRICEPS', effect: 5 }, { exKey: 'BB_BENCH_PRESS', muscleKey: 'FRONT_DELTOID', effect: 5 },
        { exKey: 'BB_SQUAT', muscleKey: 'QUADRICEPS', effect: 10 }, { exKey: 'BB_SQUAT', muscleKey: 'GLUTES', effect: 10 }, { exKey: 'BB_SQUAT', muscleKey: 'HAMSTRINGS', effect: 5 },
        { exKey: 'BB_DEADLIFT', muscleKey: 'GLUTES', effect: 10 }, { exKey: 'BB_DEADLIFT', muscleKey: 'HAMSTRINGS', effect: 10 }, { exKey: 'BB_DEADLIFT', muscleKey: 'LOWER_BACK', effect: 10 }, { exKey: 'BB_DEADLIFT', muscleKey: 'LATS', effect: 5 },
        { exKey: 'BB_OVERHEAD_PRESS', muscleKey: 'FRONT_DELTOID', effect: 10 }, { exKey: 'BB_OVERHEAD_PRESS', muscleKey: 'SIDE_DELTOID', effect: 5 }, { exKey: 'BB_OVERHEAD_PRESS', muscleKey: 'TRICEPS', effect: 5 },
        { exKey: 'BB_BENT_OVER_ROW', muscleKey: 'LATS', effect: 10 }, { exKey: 'BB_BENT_OVER_ROW', muscleKey: 'TRAPS', effect: 5 }, { exKey: 'BB_BENT_OVER_ROW', muscleKey: 'BICEPS', effect: 5 },
        { exKey: 'BB_HIP_THRUST', muscleKey: 'GLUTES', effect: 10 }, { exKey: 'BB_HIP_THRUST', muscleKey: 'HAMSTRINGS', effect: 5 },
        // Kettlebell
        { exKey: 'KB_SWING', muscleKey: 'GLUTES', effect: 10 }, { exKey: 'KB_SWING', muscleKey: 'HAMSTRINGS', effect: 5 }, { exKey: 'KB_SWING', muscleKey: 'LOWER_BACK', effect: 5 },
        { exKey: 'KB_GOBLET_SQUAT', muscleKey: 'QUADRICEPS', effect: 10 }, { exKey: 'KB_GOBLET_SQUAT', muscleKey: 'GLUTES', effect: 10 },
        { exKey: 'KB_ONE_ARM_PRESS', muscleKey: 'FRONT_DELTOID', effect: 10 }, { exKey: 'KB_ONE_ARM_PRESS', muscleKey: 'TRICEPS', effect: 5 },
        { exKey: 'KB_FARMERS_WALK', muscleKey: 'FOREARM', effect: 10 }, { exKey: 'KB_FARMERS_WALK', muscleKey: 'TRAPS', effect: 5 },
        // Resistance band
        { exKey: 'BAND_FACE_PULL', muscleKey: 'REAR_DELTOID', effect: 10 }, { exKey: 'BAND_FACE_PULL', muscleKey: 'RHOMBOIDS', effect: 5 },
        { exKey: 'BAND_PULL_APART', muscleKey: 'REAR_DELTOID', effect: 10 }, { exKey: 'BAND_PULL_APART', muscleKey: 'RHOMBOIDS', effect: 5 },
        { exKey: 'BAND_CHEST_FLY', muscleKey: 'CHEST', effect: 10 },
        { exKey: 'BAND_WOODCHOP', muscleKey: 'OBLIQUES', effect: 10 }, { exKey: 'BAND_WOODCHOP', muscleKey: 'ABS', effect: 5 },
        // Pull-up bar
        { exKey: 'PUB_CHIN_UP', muscleKey: 'LATS', effect: 10 }, { exKey: 'PUB_CHIN_UP', muscleKey: 'BICEPS', effect: 10 },
        { exKey: 'PUB_PULL_UP', muscleKey: 'LATS', effect: 10 }, { exKey: 'PUB_PULL_UP', muscleKey: 'BICEPS', effect: 5 }, { exKey: 'PUB_PULL_UP', muscleKey: 'REAR_DELTOID', effect: 5 },
        { exKey: 'PUB_HANGING_LEG_RAISE', muscleKey: 'ABS', effect: 10 }, { exKey: 'PUB_HANGING_LEG_RAISE', muscleKey: 'HIP_FLEXORS', effect: 5 },
        // Bench
        { exKey: 'BENCH_DIPS', muscleKey: 'TRICEPS', effect: 10 }, { exKey: 'BENCH_DIPS', muscleKey: 'CHEST', effect: 5 },
        { exKey: 'STEP_UP_ON_BENCH', muscleKey: 'QUADRICEPS', effect: 10 }, { exKey: 'STEP_UP_ON_BENCH', muscleKey: 'GLUTES', effect: 5 },
    ];

    for (const tm of exerciseTargetMuscleData) {
        const exId = exerciseMap[tm.exKey];
        const muscleId = muscleMap[tm.muscleKey];
        await prisma.exerciseTargetMuscle.upsert({
            where: { exercise_id_muscle_id: { exercise_id: exId, muscle_id: muscleId } },
            update: { effect_on_muscle: tm.effect },
            create: { exercise_id: exId, muscle_id: muscleId, effect_on_muscle: tm.effect },
        });
    }
    console.log('✅ Exercise target muscles seeded');

    // ============================================================================
    // EXERCISE EQUIPMENT RELATIONS (using key lookups)
    // ============================================================================
    const exerciseEquipmentData = [
        // Bodyweight
        { exKey: 'BW_PUSH_UP', eqKey: 'BODYWEIGHT' }, { exKey: 'BW_SQUAT', eqKey: 'BODYWEIGHT' }, { exKey: 'BW_LUNGE', eqKey: 'BODYWEIGHT' },
        { exKey: 'PLANK', eqKey: 'BODYWEIGHT' }, { exKey: 'CRUNCHES', eqKey: 'BODYWEIGHT' }, { exKey: 'BW_RUSSIAN_TWIST', eqKey: 'BODYWEIGHT' },
        { exKey: 'GLUTE_BRIDGE', eqKey: 'BODYWEIGHT' }, { exKey: 'BW_CALF_RAISE', eqKey: 'BODYWEIGHT' }, { exKey: 'SUPERMAN', eqKey: 'BODYWEIGHT' },
        // Dumbbell
        { exKey: 'DB_BENCH_PRESS', eqKey: 'DUMBBELL' }, { exKey: 'DB_SHOULDER_PRESS', eqKey: 'DUMBBELL' }, { exKey: 'DB_LATERAL_RAISE', eqKey: 'DUMBBELL' },
        { exKey: 'DB_BICEP_CURL', eqKey: 'DUMBBELL' }, { exKey: 'DB_TRICEP_EXTENSION', eqKey: 'DUMBBELL' }, { exKey: 'DB_ROW', eqKey: 'DUMBBELL' },
        { exKey: 'DB_GOBLET_SQUAT', eqKey: 'DUMBBELL' }, { exKey: 'DB_STIFF_LEG_DEADLIFT', eqKey: 'DUMBBELL' },
        // Barbell (some with bench)
        { exKey: 'BB_BENCH_PRESS', eqKey: 'BARBELL' }, { exKey: 'BB_BENCH_PRESS', eqKey: 'BENCH' },
        { exKey: 'BB_SQUAT', eqKey: 'BARBELL' }, { exKey: 'BB_DEADLIFT', eqKey: 'BARBELL' },
        { exKey: 'BB_OVERHEAD_PRESS', eqKey: 'BARBELL' }, { exKey: 'BB_BENT_OVER_ROW', eqKey: 'BARBELL' },
        { exKey: 'BB_HIP_THRUST', eqKey: 'BARBELL' }, { exKey: 'BB_HIP_THRUST', eqKey: 'BENCH' },
        // Kettlebell
        { exKey: 'KB_SWING', eqKey: 'KETTLEBELL' }, { exKey: 'KB_GOBLET_SQUAT', eqKey: 'KETTLEBELL' },
        { exKey: 'KB_ONE_ARM_PRESS', eqKey: 'KETTLEBELL' }, { exKey: 'KB_FARMERS_WALK', eqKey: 'KETTLEBELL' },
        // Resistance band
        { exKey: 'BAND_FACE_PULL', eqKey: 'RESISTANCE_BAND' }, { exKey: 'BAND_PULL_APART', eqKey: 'RESISTANCE_BAND' },
        { exKey: 'BAND_CHEST_FLY', eqKey: 'RESISTANCE_BAND' }, { exKey: 'BAND_WOODCHOP', eqKey: 'RESISTANCE_BAND' },
        // Pull-up bar
        { exKey: 'PUB_CHIN_UP', eqKey: 'PULL_UP_BAR' }, { exKey: 'PUB_PULL_UP', eqKey: 'PULL_UP_BAR' }, { exKey: 'PUB_HANGING_LEG_RAISE', eqKey: 'PULL_UP_BAR' },
        // Bench
        { exKey: 'BENCH_DIPS', eqKey: 'BENCH' }, { exKey: 'STEP_UP_ON_BENCH', eqKey: 'BENCH' },
    ];

    for (const ee of exerciseEquipmentData) {
        const exId = exerciseMap[ee.exKey];
        const eqId = equipmentMap[ee.eqKey];
        await prisma.exerciseEquipment.upsert({
            where: { exercise_id_equipment_id: { exercise_id: exId, equipment_id: eqId } },
            update: {},
            create: { exercise_id: exId, equipment_id: eqId },
        });
    }
    console.log('✅ Exercise equipment seeded');

    // ============================================================================
    // EXERCISE ATTRIBUTE RELATIONS (using key lookups)
    // ============================================================================
    const exerciseAttributeData = [
        // Bodyweight
        { exKey: 'BW_PUSH_UP', attrKey: 'HYPERTROPHY', level: 5 }, { exKey: 'BW_PUSH_UP', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'BW_SQUAT', attrKey: 'CALORIE_BURN', level: 10 }, { exKey: 'BW_SQUAT', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'BW_SQUAT', attrKey: 'HYPERTROPHY', level: 5 },
        { exKey: 'BW_LUNGE', attrKey: 'CALORIE_BURN', level: 10 }, { exKey: 'BW_LUNGE', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'PLANK', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'PLANK', attrKey: 'STRENGTH_BASE', level: 5 },
        { exKey: 'CRUNCHES', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'BW_RUSSIAN_TWIST', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'BW_RUSSIAN_TWIST', attrKey: 'CALORIE_BURN', level: 5 },
        { exKey: 'GLUTE_BRIDGE', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'GLUTE_BRIDGE', attrKey: 'HYPERTROPHY', level: 5 },
        { exKey: 'BW_CALF_RAISE', attrKey: 'AESTHETIC_SHAPING', level: 5 },
        { exKey: 'SUPERMAN', attrKey: 'AESTHETIC_SHAPING', level: 5 }, { exKey: 'SUPERMAN', attrKey: 'STRENGTH_BASE', level: 5 },
        // Dumbbell
        { exKey: 'DB_BENCH_PRESS', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'DB_BENCH_PRESS', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'DB_BENCH_PRESS', attrKey: 'STRENGTH_BASE', level: 5 },
        { exKey: 'DB_SHOULDER_PRESS', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'DB_SHOULDER_PRESS', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'DB_LATERAL_RAISE', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'DB_BICEP_CURL', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'DB_BICEP_CURL', attrKey: 'HYPERTROPHY', level: 5 },
        { exKey: 'DB_TRICEP_EXTENSION', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'DB_TRICEP_EXTENSION', attrKey: 'HYPERTROPHY', level: 5 },
        { exKey: 'DB_ROW', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'DB_ROW', attrKey: 'AESTHETIC_SHAPING', level: 5 }, { exKey: 'DB_ROW', attrKey: 'STRENGTH_BASE', level: 5 },
        { exKey: 'DB_GOBLET_SQUAT', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'DB_GOBLET_SQUAT', attrKey: 'CALORIE_BURN', level: 5 }, { exKey: 'DB_GOBLET_SQUAT', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'DB_STIFF_LEG_DEADLIFT', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'DB_STIFF_LEG_DEADLIFT', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'DB_STIFF_LEG_DEADLIFT', attrKey: 'STRENGTH_BASE', level: 5 },
        // Barbell
        { exKey: 'BB_BENCH_PRESS', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'BB_BENCH_PRESS', attrKey: 'STRENGTH_BASE', level: 10 }, { exKey: 'BB_BENCH_PRESS', attrKey: 'AESTHETIC_SHAPING', level: 5 },
        { exKey: 'BB_SQUAT', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'BB_SQUAT', attrKey: 'STRENGTH_BASE', level: 10 }, { exKey: 'BB_SQUAT', attrKey: 'CALORIE_BURN', level: 10 },
        { exKey: 'BB_DEADLIFT', attrKey: 'STRENGTH_BASE', level: 10 }, { exKey: 'BB_DEADLIFT', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'BB_DEADLIFT', attrKey: 'CALORIE_BURN', level: 5 },
        { exKey: 'BB_OVERHEAD_PRESS', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'BB_OVERHEAD_PRESS', attrKey: 'STRENGTH_BASE', level: 10 },
        { exKey: 'BB_BENT_OVER_ROW', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'BB_BENT_OVER_ROW', attrKey: 'STRENGTH_BASE', level: 10 },
        { exKey: 'BB_HIP_THRUST', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'BB_HIP_THRUST', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'BB_HIP_THRUST', attrKey: 'STRENGTH_BASE', level: 5 },
        // Kettlebell
        { exKey: 'KB_SWING', attrKey: 'CALORIE_BURN', level: 10 }, { exKey: 'KB_SWING', attrKey: 'STRENGTH_BASE', level: 5 }, { exKey: 'KB_SWING', attrKey: 'AESTHETIC_SHAPING', level: 5 },
        { exKey: 'KB_GOBLET_SQUAT', attrKey: 'HYPERTROPHY', level: 5 }, { exKey: 'KB_GOBLET_SQUAT', attrKey: 'CALORIE_BURN', level: 10 }, { exKey: 'KB_GOBLET_SQUAT', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'KB_ONE_ARM_PRESS', attrKey: 'HYPERTROPHY', level: 5 }, { exKey: 'KB_ONE_ARM_PRESS', attrKey: 'STRENGTH_BASE', level: 5 }, { exKey: 'KB_ONE_ARM_PRESS', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'KB_FARMERS_WALK', attrKey: 'CALORIE_BURN', level: 10 }, { exKey: 'KB_FARMERS_WALK', attrKey: 'STRENGTH_BASE', level: 10 },
        // Resistance band
        { exKey: 'BAND_FACE_PULL', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'BAND_PULL_APART', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'BAND_CHEST_FLY', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'BAND_WOODCHOP', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'BAND_WOODCHOP', attrKey: 'CALORIE_BURN', level: 5 },
        // Pull-up bar
        { exKey: 'PUB_CHIN_UP', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'PUB_CHIN_UP', attrKey: 'STRENGTH_BASE', level: 5 }, { exKey: 'PUB_CHIN_UP', attrKey: 'AESTHETIC_SHAPING', level: 5 },
        { exKey: 'PUB_PULL_UP', attrKey: 'HYPERTROPHY', level: 10 }, { exKey: 'PUB_PULL_UP', attrKey: 'STRENGTH_BASE', level: 10 },
        { exKey: 'PUB_HANGING_LEG_RAISE', attrKey: 'AESTHETIC_SHAPING', level: 10 }, { exKey: 'PUB_HANGING_LEG_RAISE', attrKey: 'STRENGTH_BASE', level: 5 },
        // Bench
        { exKey: 'BENCH_DIPS', attrKey: 'HYPERTROPHY', level: 5 }, { exKey: 'BENCH_DIPS', attrKey: 'AESTHETIC_SHAPING', level: 10 },
        { exKey: 'STEP_UP_ON_BENCH', attrKey: 'CALORIE_BURN', level: 10 }, { exKey: 'STEP_UP_ON_BENCH', attrKey: 'AESTHETIC_SHAPING', level: 10 },
    ];

    for (const ea of exerciseAttributeData) {
        const exId = exerciseMap[ea.exKey];
        const attrId = attributeMap[ea.attrKey];
        await prisma.exerciseAttributeRelation.upsert({
            where: { exercise_id_attribute_id: { exercise_id: exId, attribute_id: attrId } },
            update: { exercise_attribute_level: ea.level },
            create: { exercise_id: exId, attribute_id: attrId, exercise_attribute_level: ea.level },
        });
    }
    console.log('✅ Exercise attributes seeded');

    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
