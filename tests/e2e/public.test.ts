import { api, generateTestUser, getTokens } from '../helpers.js';
import { prisma } from '../../src/config/index.js';

describe('Public Endpoints', () => {
    // ============================================================================
    // FITNESS GOALS TESTS
    // ============================================================================

    describe('GET /api/public/fitness-goals', () => {
        it('should return fitness goals list', async () => {
            const response = await api.get('/api/public/fitness-goals');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('key');
            expect(response.body.data[0]).toHaveProperty('name');
        });

        it('should return fitness goals in Turkish', async () => {
            const response = await api.get('/api/public/fitness-goals?lang=tr');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });

    // ============================================================================
    // LANGUAGES TESTS
    // ============================================================================

    describe('GET /api/public/languages', () => {
        it('should return languages list', async () => {
            const response = await api.get('/api/public/languages');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should include language code and name', async () => {
            const response = await api.get('/api/public/languages');

            expect(response.status).toBe(200);
            const language = response.body.data[0];
            expect(language).toHaveProperty('id');
            expect(language).toHaveProperty('code');
            expect(language).toHaveProperty('name');
        });
    });

    // ============================================================================
    // BODY TARGETS TESTS
    // ============================================================================

    describe('GET /api/public/body-targets', () => {
        it('should return body targets for MALE', async () => {
            const response = await api.get('/api/public/body-targets?gender=MALE');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });

        it('should return body targets for FEMALE', async () => {
            const response = await api.get('/api/public/body-targets?gender=FEMALE');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });

        it('should return MALE body targets for OTHER gender', async () => {
            const response = await api.get('/api/public/body-targets?gender=OTHER');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });

        it('should return error without gender param', async () => {
            const response = await api.get('/api/public/body-targets');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should return error for invalid gender', async () => {
            const response = await api.get('/api/public/body-targets?gender=INVALID');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // EQUIPMENT TESTS
    // ============================================================================

    describe('GET /api/public/equipment', () => {
        it('should return equipment list', async () => {
            const response = await api.get('/api/public/equipment');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });

    // ============================================================================
    // HEALTH LIMITATIONS TESTS
    // ============================================================================

    describe('GET /api/public/health-limitations', () => {
        it('should return health limitations list', async () => {
            const response = await api.get('/api/public/health-limitations');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });

    // ============================================================================
    // EXERCISE CATEGORIES TESTS
    // ============================================================================

    describe('GET /api/public/exercise-categories', () => {
        it('should return exercise categories list', async () => {
            const response = await api.get('/api/public/exercise-categories');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('key');
            expect(response.body.data[0]).toHaveProperty('name');
        });
    });

    // ============================================================================
    // MOVEMENT PATTERNS TESTS
    // ============================================================================

    describe('GET /api/public/movement-patterns', () => {
        it('should return movement patterns list', async () => {
            const response = await api.get('/api/public/movement-patterns');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('key');
            expect(response.body.data[0]).toHaveProperty('name');
        });
    });

    // ============================================================================
    // MUSCLES TESTS
    // ============================================================================

    describe('GET /api/public/muscles', () => {
        it('should return muscles list', async () => {
            const response = await api.get('/api/public/muscles');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('muscleGroup');
            expect(response.body.data[0]).toHaveProperty('muscleSubgroup');
        });
    });

    // ============================================================================
    // EXERCISES TESTS
    // ============================================================================

    describe('GET /api/public/exercises', () => {
        it('should return exercises list with relations', async () => {
            const response = await api.get('/api/public/exercises');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);

            const exercise = response.body.data[0];
            expect(exercise).toHaveProperty('id');
            expect(exercise).toHaveProperty('key');
            expect(exercise).toHaveProperty('name');
            expect(exercise).toHaveProperty('category');
            expect(exercise).toHaveProperty('movementPattern');
            expect(exercise).toHaveProperty('targetMuscles');
            expect(exercise).toHaveProperty('equipment');
            expect(exercise.targetMuscles).toBeInstanceOf(Array);
            expect(exercise.equipment).toBeInstanceOf(Array);
        });

        it('should return exercises in Turkish when lang=tr', async () => {
            const response = await api.get('/api/public/exercises?lang=tr');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });

    // ============================================================================
    // USERNAME AVAILABILITY TESTS
    // ============================================================================

    describe('GET /api/public/check-username/:username', () => {
        let existingUsername: string;

        beforeAll(async () => {
            // Create a user to test existing username
            const testUser = await generateTestUser();
            await api.post('/api/auth/register').send(testUser);
            existingUsername = testUser.username;
        });

        it('should return available for new username', async () => {
            const newUsername = `avail${Date.now().toString().slice(-8)}`;
            const response = await api.get(`/api/public/check-username/${newUsername}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.available).toBe(true);
        });

        it('should return unavailable for existing username', async () => {
            const response = await api.get(`/api/public/check-username/${existingUsername}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.available).toBe(false);
        });

        it('should reject invalid username format (too short)', async () => {
            const response = await api.get('/api/public/check-username/ab');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject username with uppercase', async () => {
            const response = await api.get('/api/public/check-username/InvalidUpper');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // EMAIL AVAILABILITY TESTS
    // ============================================================================

    describe('GET /api/public/check-email/:email', () => {
        let existingEmail: string;

        beforeAll(async () => {
            // Create a user to test existing email
            const testUser = await generateTestUser();
            await api.post('/api/auth/register').send(testUser);

            // Verify user so email is "taken"
            await prisma.user.update({
                where: { email: testUser.email },
                data: { is_email_verified: true }
            });

            existingEmail = testUser.email;
        });

        it('should return available for new email', async () => {
            const newEmail = `newemail${Date.now()}@example.com`;
            const response = await api.get(`/api/public/check-email/${encodeURIComponent(newEmail)}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.available).toBe(true);
        });

        it('should return unavailable for existing verified email', async () => {
            const response = await api.get(`/api/public/check-email/${encodeURIComponent(existingEmail)}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.available).toBe(false);
        });

        it('should reject invalid email format', async () => {
            const response = await api.get('/api/public/check-email/invalid-email');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});
