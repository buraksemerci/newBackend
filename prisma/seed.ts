import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // ============================================================================
    // LANGUAGES
    // ============================================================================
    const english = await prisma.language.upsert({
        where: { code: 'en' },
        update: {},
        create: { code: 'en', name: 'English', isActive: true },
    });

    const turkish = await prisma.language.upsert({
        where: { code: 'tr' },
        update: {},
        create: { code: 'tr', name: 'Türkçe', isActive: true },
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
            where: { key: goal.key },
            update: {},
            create: { key: goal.key },
        });

        await prisma.fitnessGoalTranslation.upsert({
            where: { fitnessGoalId_languageId: { fitnessGoalId: fitnessGoal.id, languageId: english.id } },
            update: { name: goal.en },
            create: { fitnessGoalId: fitnessGoal.id, languageId: english.id, name: goal.en },
        });

        await prisma.fitnessGoalTranslation.upsert({
            where: { fitnessGoalId_languageId: { fitnessGoalId: fitnessGoal.id, languageId: turkish.id } },
            update: { name: goal.tr },
            create: { fitnessGoalId: fitnessGoal.id, languageId: turkish.id, name: goal.tr },
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
            where: { key_targetGender: { key: target.key, targetGender: 'MALE' } },
            update: {},
            create: { key: target.key, targetGender: 'MALE' },
        });

        await prisma.bodyTargetTranslation.upsert({
            where: { bodyTargetId_languageId: { bodyTargetId: bodyTarget.id, languageId: english.id } },
            update: { name: target.en },
            create: { bodyTargetId: bodyTarget.id, languageId: english.id, name: target.en },
        });

        await prisma.bodyTargetTranslation.upsert({
            where: { bodyTargetId_languageId: { bodyTargetId: bodyTarget.id, languageId: turkish.id } },
            update: { name: target.tr },
            create: { bodyTargetId: bodyTarget.id, languageId: turkish.id, name: target.tr },
        });
    }

    for (const target of femaleBodyTargets) {
        const bodyTarget = await prisma.bodyTarget.upsert({
            where: { key_targetGender: { key: target.key, targetGender: 'FEMALE' } },
            update: {},
            create: { key: target.key, targetGender: 'FEMALE' },
        });

        await prisma.bodyTargetTranslation.upsert({
            where: { bodyTargetId_languageId: { bodyTargetId: bodyTarget.id, languageId: english.id } },
            update: { name: target.en },
            create: { bodyTargetId: bodyTarget.id, languageId: english.id, name: target.en },
        });

        await prisma.bodyTargetTranslation.upsert({
            where: { bodyTargetId_languageId: { bodyTargetId: bodyTarget.id, languageId: turkish.id } },
            update: { name: target.tr },
            create: { bodyTargetId: bodyTarget.id, languageId: turkish.id, name: target.tr },
        });
    }
    console.log('✅ Body targets seeded');

    // ============================================================================
    // HEALTH LIMITATIONS
    // ============================================================================
    const healthLimitations = [
        { key: 'back_pain', en: 'Back Pain', tr: 'Bel Ağrısı', enDesc: 'Lower back issues', trDesc: 'Bel bölgesi sorunları' },
        { key: 'knee_injury', en: 'Knee Injury', tr: 'Diz Sakatlığı', enDesc: 'Knee problems', trDesc: 'Diz problemleri' },
        { key: 'shoulder_injury', en: 'Shoulder Injury', tr: 'Omuz Sakatlığı', enDesc: 'Shoulder issues', trDesc: 'Omuz sorunları' },
        { key: 'heart_condition', en: 'Heart Condition', tr: 'Kalp Rahatsızlığı', enDesc: 'Cardiovascular issues', trDesc: 'Kalp damar hastalıkları' },
        { key: 'pregnancy', en: 'Pregnancy', tr: 'Hamilelik', enDesc: 'Pregnant women', trDesc: 'Hamile kadınlar' },
        { key: 'high_blood_pressure', en: 'High Blood Pressure', tr: 'Yüksek Tansiyon', enDesc: 'Hypertension', trDesc: 'Hipertansiyon' },
    ];

    for (const limitation of healthLimitations) {
        const healthLimit = await prisma.healthLimitation.upsert({
            where: { key: limitation.key },
            update: {},
            create: { key: limitation.key },
        });

        await prisma.healthLimitationTranslation.upsert({
            where: { healthLimitationId_languageId: { healthLimitationId: healthLimit.id, languageId: english.id } },
            update: { name: limitation.en, description: limitation.enDesc },
            create: { healthLimitationId: healthLimit.id, languageId: english.id, name: limitation.en, description: limitation.enDesc },
        });

        await prisma.healthLimitationTranslation.upsert({
            where: { healthLimitationId_languageId: { healthLimitationId: healthLimit.id, languageId: turkish.id } },
            update: { name: limitation.tr, description: limitation.trDesc },
            create: { healthLimitationId: healthLimit.id, languageId: turkish.id, name: limitation.tr, description: limitation.trDesc },
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
            where: { key: equip.key },
            update: { isDefault: equip.isDefault },
            create: { key: equip.key, isDefault: equip.isDefault },
        });

        await prisma.equipmentTranslation.upsert({
            where: { equipmentId_languageId: { equipmentId: equipment.id, languageId: english.id } },
            update: { name: equip.en },
            create: { equipmentId: equipment.id, languageId: english.id, name: equip.en },
        });

        await prisma.equipmentTranslation.upsert({
            where: { equipmentId_languageId: { equipmentId: equipment.id, languageId: turkish.id } },
            update: { name: equip.tr },
            create: { equipmentId: equipment.id, languageId: turkish.id, name: equip.tr },
        });
    }
    console.log('✅ Equipment seeded');

    // ============================================================================
    // WORKOUT LOCATIONS
    // ============================================================================
    const workoutLocations = [
        { key: 'home', en: 'Home', tr: 'Ev' },
        { key: 'gym', en: 'Gym', tr: 'Spor Salonu' },
        { key: 'park', en: 'Park', tr: 'Park' },
        { key: 'outdoor', en: 'Outdoor', tr: 'Açık Alan' },
    ];

    for (const location of workoutLocations) {
        const wLocation = await prisma.workoutLocation.upsert({
            where: { key: location.key },
            update: {},
            create: { key: location.key },
        });

        await prisma.workoutLocationTranslation.upsert({
            where: { workoutLocationId_languageId: { workoutLocationId: wLocation.id, languageId: english.id } },
            update: { name: location.en },
            create: { workoutLocationId: wLocation.id, languageId: english.id, name: location.en },
        });

        await prisma.workoutLocationTranslation.upsert({
            where: { workoutLocationId_languageId: { workoutLocationId: wLocation.id, languageId: turkish.id } },
            update: { name: location.tr },
            create: { workoutLocationId: wLocation.id, languageId: turkish.id, name: location.tr },
        });
    }
    console.log('✅ Workout locations seeded');

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
