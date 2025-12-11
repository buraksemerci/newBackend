import { api, generateTestUser, getTokens, authHeader } from '../helpers.js';
import { prisma } from '../../src/config/index.js';

describe('User Endpoints', () => {
    let tokens: { accessToken: string; refreshToken: string };
    let testUser: Awaited<ReturnType<typeof generateTestUser>>;

    beforeAll(async () => {
        // Register and login a test user
        testUser = await generateTestUser();
        const registerResponse = await api
            .post('/api/auth/register')
            .send(testUser);

        tokens = getTokens(registerResponse);

        // Verify user manually
        await prisma.user.update({
            where: { email: testUser.email },
            data: { is_email_verified: true }
        });
    });

    describe('GET /api/user/me', () => {
        it('should return current user profile', async () => {
            const response = await api
                .get('/api/user/me')
                .set(authHeader(tokens.accessToken));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('email');
            expect(response.body.data).toHaveProperty('username');
            expect(response.body.data).toHaveProperty('profile');
            expect(response.body.data).toHaveProperty('body');
            expect(response.body.data).toHaveProperty('goals');
            expect(response.body.data).toHaveProperty('settings');

            // Check profile
            expect(response.body.data.profile.firstName).toBe(testUser.profile.firstName);

            // Check body
            expect(response.body.data.body.somatotype).toBe(testUser.body.somatotype);

            // Check goals
            expect(response.body.data.goals).toHaveProperty('fitnessGoal');
            expect(response.body.data.goals).toHaveProperty('bodyTargets');
        });

        it('should reject without auth token', async () => {
            const response = await api.get('/api/user/me');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PATCH /api/user/profile', () => {
        it('should update user profile', async () => {
            const response = await api
                .patch('/api/user/profile')
                .set(authHeader(tokens.accessToken))
                .send({
                    firstName: 'Updated',
                    lastName: 'Name',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('PATCH /api/user/body', () => {
        it('should update user body info', async () => {
            const response = await api
                .patch('/api/user/body')
                .set(authHeader(tokens.accessToken))
                .send({
                    weightKg: 85,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('PATCH /api/user/fitness-goal', () => {
        it('should update fitness goal', async () => {
            const response = await api
                .patch('/api/user/fitness-goal')
                .set(authHeader(tokens.accessToken))
                .send({
                    fitnessGoalId: 2,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should reject invalid fitness goal ID', async () => {
            const response = await api
                .patch('/api/user/fitness-goal')
                .set(authHeader(tokens.accessToken))
                .send({
                    fitnessGoalId: 99999,
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PATCH /api/user/settings', () => {
        it('should update user settings', async () => {
            const response = await api
                .patch('/api/user/settings')
                .set(authHeader(tokens.accessToken))
                .send({
                    theme: 'LIGHT',
                    workoutReminders: false,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
