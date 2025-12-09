import request from 'supertest';
import app from '../src/app.js';

export const api = request(app);

// Cache for seed data IDs
let seedData: {
    fitnessGoalId: number;
    bodyTargetIds: number[];
    equipmentId: number;
    workoutLocationId: number;
    languageId: number;
} | null = null;

// Fetch and cache valid IDs from API
export const getSeedData = async () => {
    if (seedData) return seedData;

    const [fitnessGoals, bodyTargets, equipment, workoutLocations, languages] = await Promise.all([
        api.get('/api/public/fitness-goals'),
        api.get('/api/public/body-targets?gender=MALE'),
        api.get('/api/public/equipment'),
        api.get('/api/public/workout-locations'),
        api.get('/api/public/languages'),
    ]);

    seedData = {
        fitnessGoalId: fitnessGoals.body.data[0]?.id || 1,
        bodyTargetIds: bodyTargets.body.data.slice(0, 2).map((bt: { id: number }) => bt.id),
        equipmentId: equipment.body.data[0]?.id || 1,
        workoutLocationId: workoutLocations.body.data[0]?.id || 1,
        languageId: languages.body.data[0]?.id || 1,
    };

    return seedData;
};

// Test user data generator with dynamic seed data
export const generateTestUser = async () => {
    const seed = await getSeedData();
    const timestamp = Date.now();

    return {
        email: `test${timestamp}@example.com`,
        password: 'Test1234!',
        username: `u${timestamp}`,
        profile: {
            firstName: 'Test',
            lastName: 'User',
            birthDate: '1995-05-15T00:00:00.000Z',
            gender: 'MALE',
        },
        body: {
            heightCm: 180,
            weightKg: 80,
            targetWeightKg: 75,
            somatotype: 'MESOMORPH',
        },
        goals: {
            fitnessGoalId: seed.fitnessGoalId,
            bodyTargetIds: seed.bodyTargetIds,
        },
        settings: {
            preferredUnit: 'METRIC',
            languageId: seed.languageId,
            theme: 'DARK',
        },
        healthLimitationIds: [],
        equipmentIds: [seed.equipmentId],
        workoutLocationIds: [seed.workoutLocationId],
        device: {
            deviceId: `test-device-${timestamp}`,
            deviceName: 'Test Device',
            deviceType: 'WEB',
        },
    };
};

// Extract token from response
export const getTokens = (response: request.Response) => ({
    accessToken: response.body.data?.accessToken,
    refreshToken: response.body.data?.refreshToken,
});

// Auth header helper
export const authHeader = (token: string) => ({
    Authorization: `Bearer ${token}`,
});
