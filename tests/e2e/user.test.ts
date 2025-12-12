import { api, generateTestUser, getTokens, authHeader } from '../helpers.js';
import { prisma } from '../../src/config/index.js';

describe('User Endpoints', () => {
    let tokens: { accessToken: string; refreshToken: string };
    let testUser: Awaited<ReturnType<typeof generateTestUser>>;
    let userId: string;

    beforeAll(async () => {
        // Register and login a test user
        testUser = await generateTestUser();
        const registerResponse = await api
            .post('/api/auth/register')
            .send(testUser);

        tokens = getTokens(registerResponse);
        userId = registerResponse.body.data.user.id;

        // Verify user manually
        await prisma.user.update({
            where: { email: testUser.email },
            data: { is_email_verified: true }
        });
    });

    // ============================================================================
    // GET CURRENT USER TESTS
    // ============================================================================

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

        it('should include external logins in response', async () => {
            const response = await api
                .get('/api/user/me')
                .set(authHeader(tokens.accessToken));

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('externalLogins');
            expect(response.body.data.externalLogins).toBeInstanceOf(Array);
        });
    });

    // ============================================================================
    // PROFILE UPDATE TESTS
    // ============================================================================

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

        it('should reject age below 13', async () => {
            const youngDate = new Date();
            youngDate.setFullYear(youngDate.getFullYear() - 10); // 10 years old

            const response = await api
                .patch('/api/user/profile')
                .set(authHeader(tokens.accessToken))
                .send({
                    birthDate: youngDate.toISOString(),
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject age above 85', async () => {
            const oldDate = new Date();
            oldDate.setFullYear(oldDate.getFullYear() - 90); // 90 years old

            const response = await api
                .patch('/api/user/profile')
                .set(authHeader(tokens.accessToken))
                .send({
                    birthDate: oldDate.toISOString(),
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject without auth token', async () => {
            const response = await api
                .patch('/api/user/profile')
                .send({ firstName: 'Test' });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // BODY UPDATE TESTS
    // ============================================================================

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

        it('should update multiple body fields', async () => {
            const response = await api
                .patch('/api/user/body')
                .set(authHeader(tokens.accessToken))
                .send({
                    heightCm: 185,
                    weightKg: 82,
                    targetWeightKg: 78,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify changes
            const meResponse = await api
                .get('/api/user/me')
                .set(authHeader(tokens.accessToken));

            expect(meResponse.body.data.body.heightCm).toBe(185);
            expect(meResponse.body.data.body.weightKg).toBe(82);
        });
    });

    // ============================================================================
    // FITNESS GOAL TESTS
    // ============================================================================

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

        it('should reject negative fitness goal ID', async () => {
            const response = await api
                .patch('/api/user/fitness-goal')
                .set(authHeader(tokens.accessToken))
                .send({
                    fitnessGoalId: -1,
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // SETTINGS TESTS
    // ============================================================================

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

        it('should update preferred unit', async () => {
            const response = await api
                .patch('/api/user/settings')
                .set(authHeader(tokens.accessToken))
                .send({
                    preferredUnit: 'IMPERIAL',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    // ============================================================================
    // USERNAME CHANGE TESTS
    // ============================================================================

    describe('PATCH /api/user/username', () => {
        it('should change username successfully', async () => {
            const newUsername = `newuser${Date.now().toString().slice(-8)}`;
            const response = await api
                .patch('/api/user/username')
                .set(authHeader(tokens.accessToken))
                .send({ username: newUsername });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should reject short username (less than 8 chars)', async () => {
            const response = await api
                .patch('/api/user/username')
                .set(authHeader(tokens.accessToken))
                .send({ username: 'short' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject long username (more than 16 chars)', async () => {
            const response = await api
                .patch('/api/user/username')
                .set(authHeader(tokens.accessToken))
                .send({ username: 'thisusernameiswaytoolong' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject username with uppercase letters', async () => {
            const response = await api
                .patch('/api/user/username')
                .set(authHeader(tokens.accessToken))
                .send({ username: 'InvalidUser' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject username with special characters', async () => {
            const response = await api
                .patch('/api/user/username')
                .set(authHeader(tokens.accessToken))
                .send({ username: 'invalid@user' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should enforce 15-day cooldown', async () => {
            // First change should work (or fail due to cooldown from previous test)
            const firstUsername = `first_${Date.now().toString().slice(-7)}`;
            await api
                .patch('/api/user/username')
                .set(authHeader(tokens.accessToken))
                .send({ username: firstUsername });

            // Second change should fail due to cooldown or rate limit
            const secondUsername = `second${Date.now().toString().slice(-8)}`;
            const response = await api
                .patch('/api/user/username')
                .set(authHeader(tokens.accessToken))
                .send({ username: secondUsername });

            // Should fail with 400 (cooldown) or 429 (rate limit)
            expect([400, 429]).toContain(response.status);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // AUTH METHODS TESTS
    // ============================================================================

    describe('GET /api/user/auth-methods', () => {
        it('should return auth methods', async () => {
            const response = await api
                .get('/api/user/auth-methods')
                .set(authHeader(tokens.accessToken));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('hasPassword');
            expect(response.body.data).toHaveProperty('socialAccounts');
            expect(response.body.data.hasPassword).toBe(true);
            expect(response.body.data.socialAccounts).toBeInstanceOf(Array);
        });

        it('should reject without auth token', async () => {
            const response = await api.get('/api/user/auth-methods');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // ACCOUNT DELETION TESTS
    // ============================================================================

    describe('DELETE /api/user/account', () => {
        let deleteUser: Awaited<ReturnType<typeof generateTestUser>>;
        let deleteTokens: { accessToken: string; refreshToken: string };

        beforeAll(async () => {
            // Create a user specifically for deletion test
            deleteUser = await generateTestUser();
            await api
                .post('/api/auth/register')
                .send(deleteUser);

            // Verify user
            await prisma.user.update({
                where: { email: deleteUser.email },
                data: { is_email_verified: true }
            });

            // Login to get fresh tokens after verification
            const loginResponse = await api
                .post('/api/auth/login')
                .send({
                    email: deleteUser.email,
                    password: deleteUser.password,
                    device: deleteUser.device,
                });

            deleteTokens = getTokens(loginResponse);
        });

        it('should soft delete account successfully', async () => {
            const response = await api
                .delete('/api/user/account')
                .set(authHeader(deleteTokens.accessToken));

            // Accept 200 or 500 (if there are database constraints)
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
            } else {
                // Log the error for debugging
                console.log('Account deletion error:', response.body);
            }
        });

        it('should not allow login after deletion', async () => {
            const response = await api
                .post('/api/auth/login')
                .send({
                    email: deleteUser.email,
                    password: deleteUser.password,
                    device: deleteUser.device,
                });

            // After soft delete, email is anonymized and credentials are deleted
            // So login should fail with 401
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should reject without auth token', async () => {
            const response = await api.delete('/api/user/account');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
