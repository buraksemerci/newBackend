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
    // FITNESS GOALS
    // ============================================================================
    const fitnessGoalsData = [
        { key: 'lose_weight', en: 'Lose Weight', tr: 'Kilo Ver' },
        { key: 'build_muscle', en: 'Build Muscle', tr: 'Kas Yap' },
        { key: 'maintain', en: 'Maintain Weight', tr: 'Kiloyu Koru' },
        { key: 'gain_endurance', en: 'Gain Endurance', tr: 'Dayanıklılık Kazan' },
        { key: 'improve_flexibility', en: 'Improve Flexibility', tr: 'Esnekliği Geliştir' },
    ];

    for (const goal of fitnessGoalsData) {
        const fitnessGoal = await prisma.fitnessGoal.upsert({
            where: { fitness_goal_key: goal.key },
            update: {},
            create: { fitness_goal_key: goal.key },
        });

        await prisma.fitnessGoalTranslation.upsert({
            where: { fitness_goal_id_language_id: { fitness_goal_id: fitnessGoal.fitness_goal_id, language_id: english.language_id } },
            update: { name: goal.en },
            create: { fitness_goal_id: fitnessGoal.fitness_goal_id, language_id: english.language_id, name: goal.en },
        });

        await prisma.fitnessGoalTranslation.upsert({
            where: { fitness_goal_id_language_id: { fitness_goal_id: fitnessGoal.fitness_goal_id, language_id: turkish.language_id } },
            update: { name: goal.tr },
            create: { fitness_goal_id: fitnessGoal.fitness_goal_id, language_id: turkish.language_id, name: goal.tr },
        });
    }
    console.log('✅ Fitness goals seeded');

    // ============================================================================
    // BODY TARGETS
    // ============================================================================
    const maleBodyTargets = [
        { key: 'chest', en: 'Chest', tr: 'Göğüs' },
        { key: 'back', en: 'Back', tr: 'Sırt' },
        { key: 'shoulders', en: 'Shoulders', tr: 'Omuzlar' },
        { key: 'arms', en: 'Arms', tr: 'Kollar' },
        { key: 'abs', en: 'Abs', tr: 'Karın' },
        { key: 'legs', en: 'Legs', tr: 'Bacaklar' },
    ];

    const femaleBodyTargets = [
        { key: 'glutes', en: 'Glutes', tr: 'Kalça' },
        { key: 'thighs', en: 'Thighs', tr: 'Bacaklar' },
        { key: 'waist', en: 'Waist', tr: 'Bel' },
        { key: 'arms', en: 'Arms', tr: 'Kollar' },
        { key: 'abs', en: 'Abs', tr: 'Karın' },
        { key: 'back', en: 'Back', tr: 'Sırt' },
    ];

    for (const target of maleBodyTargets) {
        const bodyTarget = await prisma.bodyTarget.upsert({
            where: { body_target_key_target_gender: { body_target_key: target.key, target_gender: 'MALE' } },
            update: {},
            create: { body_target_key: target.key, target_gender: 'MALE' },
        });

        await prisma.bodyTargetTranslation.upsert({
            where: { body_target_id_language_id: { body_target_id: bodyTarget.body_target_id, language_id: english.language_id } },
            update: { name: target.en },
            create: { body_target_id: bodyTarget.body_target_id, language_id: english.language_id, name: target.en },
        });

        await prisma.bodyTargetTranslation.upsert({
            where: { body_target_id_language_id: { body_target_id: bodyTarget.body_target_id, language_id: turkish.language_id } },
            update: { name: target.tr },
            create: { body_target_id: bodyTarget.body_target_id, language_id: turkish.language_id, name: target.tr },
        });
    }

    for (const target of femaleBodyTargets) {
        const bodyTarget = await prisma.bodyTarget.upsert({
            where: { body_target_key_target_gender: { body_target_key: target.key, target_gender: 'FEMALE' } },
            update: {},
            create: { body_target_key: target.key, target_gender: 'FEMALE' },
        });

        await prisma.bodyTargetTranslation.upsert({
            where: { body_target_id_language_id: { body_target_id: bodyTarget.body_target_id, language_id: english.language_id } },
            update: { name: target.en },
            create: { body_target_id: bodyTarget.body_target_id, language_id: english.language_id, name: target.en },
        });

        await prisma.bodyTargetTranslation.upsert({
            where: { body_target_id_language_id: { body_target_id: bodyTarget.body_target_id, language_id: turkish.language_id } },
            update: { name: target.tr },
            create: { body_target_id: bodyTarget.body_target_id, language_id: turkish.language_id, name: target.tr },
        });
    }
    console.log('✅ Body targets seeded');

    // ============================================================================
    // HEALTH LIMITATIONS (with base_severity 1-3)
    // ============================================================================
    const healthLimitations = [
        { key: 'back_pain', en: 'Back Pain', tr: 'Bel Ağrısı', enDesc: 'Lower back issues', trDesc: 'Bel bölgesi sorunları', level: 2 },
        { key: 'knee_injury', en: 'Knee Injury', tr: 'Diz Sakatlığı', enDesc: 'Knee problems', trDesc: 'Diz problemleri', level: 2 },
        { key: 'shoulder_injury', en: 'Shoulder Injury', tr: 'Omuz Sakatlığı', enDesc: 'Shoulder issues', trDesc: 'Omuz sorunları', level: 2 },
        { key: 'heart_condition', en: 'Heart Condition', tr: 'Kalp Rahatsızlığı', enDesc: 'Cardiovascular issues', trDesc: 'Kalp damar hastalıkları', level: 3 },
        { key: 'pregnancy', en: 'Pregnancy', tr: 'Hamilelik', enDesc: 'Pregnant women', trDesc: 'Hamile kadınlar', level: 3 },
        { key: 'high_blood_pressure', en: 'High Blood Pressure', tr: 'Yüksek Tansiyon', enDesc: 'Hypertension', trDesc: 'Hipertansiyon', level: 2 },
    ];

    for (const limitation of healthLimitations) {
        const healthLimit = await prisma.healthLimitation.upsert({
            where: { health_limitation_key: limitation.key },
            update: { base_severity: limitation.level },
            create: { health_limitation_key: limitation.key, base_severity: limitation.level },
        });

        await prisma.healthLimitationTranslation.upsert({
            where: { health_limitation_id_language_id: { health_limitation_id: healthLimit.health_limitation_id, language_id: english.language_id } },
            update: { name: limitation.en, description: limitation.enDesc },
            create: { health_limitation_id: healthLimit.health_limitation_id, language_id: english.language_id, name: limitation.en, description: limitation.enDesc },
        });

        await prisma.healthLimitationTranslation.upsert({
            where: { health_limitation_id_language_id: { health_limitation_id: healthLimit.health_limitation_id, language_id: turkish.language_id } },
            update: { name: limitation.tr, description: limitation.trDesc },
            create: { health_limitation_id: healthLimit.health_limitation_id, language_id: turkish.language_id, name: limitation.tr, description: limitation.trDesc },
        });
    }
    console.log('✅ Health limitations seeded');

    // ============================================================================
    // EQUIPMENT
    // ============================================================================
    const equipmentList = [
        { key: 'bodyweight', en: 'Bodyweight', tr: 'Vücut Ağırlığı', isDefault: true },
        { key: 'dumbbell', en: 'Dumbbells', tr: 'Dambıl', isDefault: false },
        { key: 'barbell', en: 'Barbell', tr: 'Halter', isDefault: false },
        { key: 'kettlebell', en: 'Kettlebell', tr: 'Kettlebell', isDefault: false },
        { key: 'resistance_band', en: 'Resistance Band', tr: 'Direnç Bandı', isDefault: false },
        { key: 'pull_up_bar', en: 'Pull-up Bar', tr: 'Barfiks Çubuğu', isDefault: false },
        { key: 'bench', en: 'Bench', tr: 'Bench', isDefault: false },
        { key: 'cable_machine', en: 'Cable Machine', tr: 'Kablo Makinesi', isDefault: false },
        { key: 'treadmill', en: 'Treadmill', tr: 'Koşu Bandı', isDefault: false },
        { key: 'exercise_bike', en: 'Exercise Bike', tr: 'Kondisyon Bisikleti', isDefault: false },
    ];

    for (const equip of equipmentList) {
        const equipment = await prisma.equipment.upsert({
            where: { equipment_key: equip.key },
            update: { is_default: equip.isDefault },
            create: { equipment_key: equip.key, is_default: equip.isDefault },
        });

        await prisma.equipmentTranslation.upsert({
            where: { equipment_id_language_id: { equipment_id: equipment.equipment_id, language_id: english.language_id } },
            update: { name: equip.en },
            create: { equipment_id: equipment.equipment_id, language_id: english.language_id, name: equip.en },
        });

        await prisma.equipmentTranslation.upsert({
            where: { equipment_id_language_id: { equipment_id: equipment.equipment_id, language_id: turkish.language_id } },
            update: { name: equip.tr },
            create: { equipment_id: equipment.equipment_id, language_id: turkish.language_id, name: equip.tr },
        });
    }
    console.log('✅ Equipment seeded');

    // ============================================================================
    // EXERCISE CATEGORIES
    // ============================================================================
    const exerciseCategories = [
        { key: 'strength', en: 'Strength', tr: 'Kuvvet' },
        { key: 'cardio', en: 'Cardio', tr: 'Kardiyo' },
        { key: 'flexibility', en: 'Flexibility', tr: 'Esneklik' },
        { key: 'plyometric', en: 'Plyometric', tr: 'Patlayıcı' },
        { key: 'calisthenics', en: 'Calisthenics', tr: 'Kalistenik' },
    ];

    for (const cat of exerciseCategories) {
        const category = await prisma.exerciseCategory.upsert({
            where: { exercise_category_key: cat.key },
            update: {},
            create: { exercise_category_key: cat.key },
        });

        await prisma.exerciseCategoryTranslation.upsert({
            where: { exercise_category_id_language_id: { exercise_category_id: category.exercise_category_id, language_id: english.language_id } },
            update: { name: cat.en },
            create: { exercise_category_id: category.exercise_category_id, language_id: english.language_id, name: cat.en },
        });

        await prisma.exerciseCategoryTranslation.upsert({
            where: { exercise_category_id_language_id: { exercise_category_id: category.exercise_category_id, language_id: turkish.language_id } },
            update: { name: cat.tr },
            create: { exercise_category_id: category.exercise_category_id, language_id: turkish.language_id, name: cat.tr },
        });
    }
    console.log('✅ Exercise categories seeded');

    // ============================================================================
    // MOVEMENT PATTERNS
    // ============================================================================
    const movementPatterns = [
        { key: 'push', en: 'Push', tr: 'İtme' },
        { key: 'pull', en: 'Pull', tr: 'Çekme' },
        { key: 'hinge', en: 'Hinge', tr: 'Kalça Menteşe' },
        { key: 'squat', en: 'Squat', tr: 'Çömelme' },
        { key: 'carry', en: 'Carry', tr: 'Taşıma' },
        { key: 'rotation', en: 'Rotation', tr: 'Rotasyon' },
    ];

    for (const pattern of movementPatterns) {
        const mp = await prisma.movementPattern.upsert({
            where: { movement_pattern_key: pattern.key },
            update: {},
            create: { movement_pattern_key: pattern.key },
        });

        await prisma.movementPatternTranslation.upsert({
            where: { movement_pattern_id_language_id: { movement_pattern_id: mp.movement_pattern_id, language_id: english.language_id } },
            update: { name: pattern.en },
            create: { movement_pattern_id: mp.movement_pattern_id, language_id: english.language_id, name: pattern.en },
        });

        await prisma.movementPatternTranslation.upsert({
            where: { movement_pattern_id_language_id: { movement_pattern_id: mp.movement_pattern_id, language_id: turkish.language_id } },
            update: { name: pattern.tr },
            create: { movement_pattern_id: mp.movement_pattern_id, language_id: turkish.language_id, name: pattern.tr },
        });
    }
    console.log('✅ Movement patterns seeded');

    // ============================================================================
    // MUSCLES
    // ============================================================================
    const muscles = [
        { key: 'chest', group: 'UPPER_BODY', subgroup: 'CHEST', en: 'Chest', tr: 'Göğüs' },
        { key: 'front_deltoid', group: 'UPPER_BODY', subgroup: 'SHOULDER', en: 'Front Deltoid', tr: 'Ön Omuz' },
        { key: 'side_deltoid', group: 'UPPER_BODY', subgroup: 'SHOULDER', en: 'Side Deltoid', tr: 'Yan Omuz' },
        { key: 'rear_deltoid', group: 'UPPER_BODY', subgroup: 'SHOULDER', en: 'Rear Deltoid', tr: 'Arka Omuz' },
        { key: 'biceps', group: 'UPPER_BODY', subgroup: 'ARM', en: 'Biceps', tr: 'Biceps' },
        { key: 'triceps', group: 'UPPER_BODY', subgroup: 'ARM', en: 'Triceps', tr: 'Triceps' },
        { key: 'forearm', group: 'UPPER_BODY', subgroup: 'ARM', en: 'Forearm', tr: 'Ön Kol' },
        { key: 'lats', group: 'UPPER_BODY', subgroup: 'BACK', en: 'Lats', tr: 'Sırt (Lat)' },
        { key: 'traps', group: 'UPPER_BODY', subgroup: 'BACK', en: 'Traps', tr: 'Trapez' },
        { key: 'rhomboids', group: 'UPPER_BODY', subgroup: 'BACK', en: 'Rhomboids', tr: 'Rhomboidler' },
        { key: 'lower_back', group: 'CORE', subgroup: 'BACK', en: 'Lower Back', tr: 'Bel' },
        { key: 'abs', group: 'CORE', subgroup: 'ABS', en: 'Abs', tr: 'Karın' },
        { key: 'obliques', group: 'CORE', subgroup: 'ABS', en: 'Obliques', tr: 'Yan Karın' },
        { key: 'quadriceps', group: 'LOWER_BODY', subgroup: 'LEG', en: 'Quadriceps', tr: 'Ön Bacak' },
        { key: 'hamstrings', group: 'LOWER_BODY', subgroup: 'LEG', en: 'Hamstrings', tr: 'Arka Bacak' },
        { key: 'glutes', group: 'LOWER_BODY', subgroup: 'GLUTE', en: 'Glutes', tr: 'Kalça' },
        { key: 'calves', group: 'LOWER_BODY', subgroup: 'LEG', en: 'Calves', tr: 'Baldır' },
        { key: 'hip_flexors', group: 'LOWER_BODY', subgroup: 'HIP', en: 'Hip Flexors', tr: 'Kalça Fleksörleri' },
    ];

    for (const muscle of muscles) {
        const m = await prisma.muscle.upsert({
            where: { muscle_key: muscle.key },
            update: { muscle_group: muscle.group, muscle_subgroup: muscle.subgroup },
            create: { muscle_key: muscle.key, muscle_group: muscle.group, muscle_subgroup: muscle.subgroup },
        });

        await prisma.muscleTranslation.upsert({
            where: { muscle_id_language_id: { muscle_id: m.muscle_id, language_id: english.language_id } },
            update: { name: muscle.en },
            create: { muscle_id: m.muscle_id, language_id: english.language_id, name: muscle.en },
        });

        await prisma.muscleTranslation.upsert({
            where: { muscle_id_language_id: { muscle_id: m.muscle_id, language_id: turkish.language_id } },
            update: { name: muscle.tr },
            create: { muscle_id: m.muscle_id, language_id: turkish.language_id, name: muscle.tr },
        });
    }
    console.log('✅ Muscles seeded');

    // ============================================================================
    // BODY TARGET - MUSCLE MAPPINGS
    // ============================================================================
    const bodyTargetMuscleMapping: Record<string, string[]> = {
        'chest': ['chest'],
        'back': ['lats', 'traps', 'rhomboids', 'lower_back'],
        'shoulders': ['front_deltoid', 'side_deltoid', 'rear_deltoid'],
        'arms': ['biceps', 'triceps', 'forearm'],
        'abs': ['abs', 'obliques'],
        'legs': ['quadriceps', 'hamstrings', 'calves'],
        'glutes': ['glutes', 'hip_flexors'],
        'thighs': ['quadriceps', 'hamstrings'],
        'waist': ['abs', 'obliques', 'lower_back'],
    };

    const allBodyTargets = await prisma.bodyTarget.findMany();
    const allMuscles = await prisma.muscle.findMany();

    for (const bodyTarget of allBodyTargets) {
        const muscleKeys = bodyTargetMuscleMapping[bodyTarget.body_target_key];
        if (muscleKeys) {
            for (const muscleKey of muscleKeys) {
                const muscle = allMuscles.find(m => m.muscle_key === muscleKey);
                if (muscle) {
                    await prisma.bodyTargetMuscle.upsert({
                        where: {
                            body_target_id_muscle_id: {
                                body_target_id: bodyTarget.body_target_id,
                                muscle_id: muscle.muscle_id,
                            },
                        },
                        update: {},
                        create: {
                            body_target_id: bodyTarget.body_target_id,
                            muscle_id: muscle.muscle_id,
                        },
                    });
                }
            }
        }
    }
    console.log('✅ Body target muscle mappings seeded');

    // ============================================================================
    // EXERCISES
    // ============================================================================
    const strengthCategory = await prisma.exerciseCategory.findUnique({ where: { exercise_category_key: 'strength' } });
    const calisthenicsCategory = await prisma.exerciseCategory.findUnique({ where: { exercise_category_key: 'calisthenics' } });

    const pushPattern = await prisma.movementPattern.findUnique({ where: { movement_pattern_key: 'push' } });
    const pullPattern = await prisma.movementPattern.findUnique({ where: { movement_pattern_key: 'pull' } });
    const hingePattern = await prisma.movementPattern.findUnique({ where: { movement_pattern_key: 'hinge' } });
    const squatPattern = await prisma.movementPattern.findUnique({ where: { movement_pattern_key: 'squat' } });

    if (!strengthCategory || !calisthenicsCategory || !pushPattern || !pullPattern || !hingePattern || !squatPattern) {
        throw new Error('Required categories or patterns not found');
    }

    const exercisesData = [
        {
            key: 'bench_press', en: 'Bench Press', tr: 'Bench Press',
            enDesc: 'Lie on bench, lower barbell to chest, push up', trDesc: 'Bench üzerinde yatın, barı göğse indirin, yukarı itin',
            categoryId: strengthCategory.exercise_category_id, patternId: pushPattern.movement_pattern_id,
            isCompound: true, experienceLevel: 2, effectiveness: 9, met: 6.0, recovery: 48,
            muscles: [{ key: 'chest', level: 5 }, { key: 'triceps', level: 4 }, { key: 'front_deltoid', level: 3 }],
            equipment: ['barbell', 'bench'], attributes: ['TEMPO'],
            limitations: [{ key: 'shoulder_injury', maxSeverity: 3 }],
        },
        {
            key: 'squat', en: 'Barbell Squat', tr: 'Barbell Squat',
            enDesc: 'Bar on shoulders, squat down, stand up', trDesc: 'Bar omuzlarda, çömelin, kalkın',
            categoryId: strengthCategory.exercise_category_id, patternId: squatPattern.movement_pattern_id,
            isCompound: true, experienceLevel: 2, effectiveness: 10, met: 6.0, recovery: 72,
            muscles: [{ key: 'quadriceps', level: 5 }, { key: 'glutes', level: 4 }, { key: 'hamstrings', level: 3 }, { key: 'lower_back', level: 2 }],
            equipment: ['barbell'], attributes: ['TEMPO'],
            limitations: [{ key: 'knee_injury', maxSeverity: 4 }, { key: 'back_pain', maxSeverity: 3 }],
        },
        {
            key: 'deadlift', en: 'Deadlift', tr: 'Deadlift',
            enDesc: 'Lift barbell from floor to hip level', trDesc: 'Barı yerden kalça hizasına kaldırın',
            categoryId: strengthCategory.exercise_category_id, patternId: hingePattern.movement_pattern_id,
            isCompound: true, experienceLevel: 3, effectiveness: 10, met: 6.0, recovery: 72,
            muscles: [{ key: 'hamstrings', level: 5 }, { key: 'glutes', level: 5 }, { key: 'lower_back', level: 4 }, { key: 'lats', level: 3 }, { key: 'traps', level: 3 }],
            equipment: ['barbell'], attributes: [],
            limitations: [{ key: 'back_pain', maxSeverity: 2 }],
        },
        {
            key: 'pull_up', en: 'Pull Up', tr: 'Barfiks',
            enDesc: 'Hang from bar, pull body up until chin over bar', trDesc: 'Bardan asılın, çene barın üstüne gelene kadar çekin',
            categoryId: calisthenicsCategory.exercise_category_id, patternId: pullPattern.movement_pattern_id,
            isCompound: true, experienceLevel: 2, effectiveness: 9, met: 8.0, recovery: 48,
            muscles: [{ key: 'lats', level: 5 }, { key: 'biceps', level: 4 }, { key: 'rear_deltoid', level: 3 }, { key: 'forearm', level: 2 }],
            equipment: ['pull_up_bar'], attributes: [],
            limitations: [{ key: 'shoulder_injury', maxSeverity: 4 }],
        },
        {
            key: 'push_up', en: 'Push Up', tr: 'Şınav',
            enDesc: 'Plank position, lower chest to floor, push up', trDesc: 'Plank pozisyonunda, göğsü yere indirin, yukarı itin',
            categoryId: calisthenicsCategory.exercise_category_id, patternId: pushPattern.movement_pattern_id,
            isCompound: true, experienceLevel: 1, effectiveness: 7, met: 3.8, recovery: 24,
            muscles: [{ key: 'chest', level: 5 }, { key: 'triceps', level: 4 }, { key: 'front_deltoid', level: 3 }, { key: 'abs', level: 2 }],
            equipment: ['bodyweight'], attributes: ['WARMUP_CORE'],
            limitations: [{ key: 'shoulder_injury', maxSeverity: 5 }],
        },
        {
            key: 'dumbbell_curl', en: 'Dumbbell Curl', tr: 'Dambıl Curl',
            enDesc: 'Hold dumbbells, curl up to shoulders', trDesc: 'Dambılları tutun, omuza doğru kaldırın',
            categoryId: strengthCategory.exercise_category_id, patternId: pullPattern.movement_pattern_id,
            isCompound: false, experienceLevel: 1, effectiveness: 6, met: 3.0, recovery: 24,
            muscles: [{ key: 'biceps', level: 5 }, { key: 'forearm', level: 2 }],
            equipment: ['dumbbell'], attributes: ['TEMPO', 'UNILATERAL'],
            limitations: [],
        },
        {
            key: 'plank', en: 'Plank', tr: 'Plank',
            enDesc: 'Hold push-up position with straight body', trDesc: 'Düz vücut ile şınav pozisyonunda bekleyin',
            categoryId: calisthenicsCategory.exercise_category_id, patternId: pushPattern.movement_pattern_id,
            isCompound: false, experienceLevel: 1, effectiveness: 6, met: 3.0, recovery: 24,
            muscles: [{ key: 'abs', level: 5 }, { key: 'obliques', level: 4 }, { key: 'lower_back', level: 3 }],
            equipment: ['bodyweight'], attributes: ['WARMUP_CORE', 'BALANCE'],
            limitations: [{ key: 'back_pain', maxSeverity: 6 }],
        },
        {
            key: 'lunges', en: 'Lunges', tr: 'Lunge',
            enDesc: 'Step forward, lower back knee toward ground', trDesc: 'Öne adım atın, arka dizi yere doğru indirin',
            categoryId: calisthenicsCategory.exercise_category_id, patternId: squatPattern.movement_pattern_id,
            isCompound: true, experienceLevel: 1, effectiveness: 7, met: 4.0, recovery: 24,
            muscles: [{ key: 'quadriceps', level: 5 }, { key: 'glutes', level: 4 }, { key: 'hamstrings', level: 3 }],
            equipment: ['bodyweight'], attributes: ['UNILATERAL', 'BALANCE'],
            limitations: [{ key: 'knee_injury', maxSeverity: 5 }],
        },
    ];

    const allEquipment = await prisma.equipment.findMany();
    const allHealthLimitations = await prisma.healthLimitation.findMany();

    for (const ex of exercisesData) {
        const exercise = await prisma.exercise.upsert({
            where: { exercise_key: ex.key },
            update: {
                is_compound: ex.isCompound,
                experience_level: ex.experienceLevel,
                effectiveness_score: ex.effectiveness,
                met_value: ex.met,
                recovery_time_hours: ex.recovery,
            },
            create: {
                exercise_key: ex.key,
                exercise_category_id: ex.categoryId,
                movement_pattern_id: ex.patternId,
                is_compound: ex.isCompound,
                experience_level: ex.experienceLevel,
                effectiveness_score: ex.effectiveness,
                met_value: ex.met,
                recovery_time_hours: ex.recovery,
            },
        });

        await prisma.exerciseTranslation.upsert({
            where: { exercise_id_language_id: { exercise_id: exercise.exercise_id, language_id: english.language_id } },
            update: { name: ex.en, description: ex.enDesc },
            create: { exercise_id: exercise.exercise_id, language_id: english.language_id, name: ex.en, description: ex.enDesc },
        });
        await prisma.exerciseTranslation.upsert({
            where: { exercise_id_language_id: { exercise_id: exercise.exercise_id, language_id: turkish.language_id } },
            update: { name: ex.tr, description: ex.trDesc },
            create: { exercise_id: exercise.exercise_id, language_id: turkish.language_id, name: ex.tr, description: ex.trDesc },
        });

        for (const tm of ex.muscles) {
            const muscle = allMuscles.find(m => m.muscle_key === tm.key);
            if (muscle) {
                await prisma.exerciseTargetMuscle.upsert({
                    where: { exercise_id_muscle_id: { exercise_id: exercise.exercise_id, muscle_id: muscle.muscle_id } },
                    update: { contribution_level: tm.level },
                    create: { exercise_id: exercise.exercise_id, muscle_id: muscle.muscle_id, contribution_level: tm.level },
                });
            }
        }

        for (const eqKey of ex.equipment) {
            const equip = allEquipment.find(e => e.equipment_key === eqKey);
            if (equip) {
                await prisma.exerciseEquipment.upsert({
                    where: { exercise_id_equipment_id: { exercise_id: exercise.exercise_id, equipment_id: equip.equipment_id } },
                    update: {},
                    create: { exercise_id: exercise.exercise_id, equipment_id: equip.equipment_id },
                });
            }
        }

        for (const attrKey of ex.attributes) {
            await prisma.exerciseAttribute.upsert({
                where: { exercise_id_attribute_key: { exercise_id: exercise.exercise_id, attribute_key: attrKey } },
                update: {},
                create: { exercise_id: exercise.exercise_id, attribute_key: attrKey },
            });
        }

        for (const lim of ex.limitations) {
            const healthLim = allHealthLimitations.find(h => h.health_limitation_key === lim.key);
            if (healthLim) {
                await prisma.exerciseLimitation.upsert({
                    where: { exercise_id_health_limitation_id: { exercise_id: exercise.exercise_id, health_limitation_id: healthLim.health_limitation_id } },
                    update: { max_severity_allowed: lim.maxSeverity },
                    create: { exercise_id: exercise.exercise_id, health_limitation_id: healthLim.health_limitation_id, max_severity_allowed: lim.maxSeverity },
                });
            }
        }
    }
    console.log('✅ Exercises seeded');

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
