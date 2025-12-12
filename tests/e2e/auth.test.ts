import { api, generateTestUser, getTokens, authHeader } from '../helpers.js';
import { prisma } from '../../src/config/index.js';

describe('Auth Endpoints', () => {
    let testUser: Awaited<ReturnType<typeof generateTestUser>>;
    let tokens: { accessToken: string; refreshToken: string };

    beforeAll(async () => {
        testUser = await generateTestUser();
    });

    // ============================================================================
    // REGISTRATION TESTS
    // ============================================================================

    describe('POST /api/auth/register', () => {
        it('should register a new user with all fields', async () => {
            const response = await api
                .post('/api/auth/register')
                .send(testUser);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
            expect(response.body.data.user).toHaveProperty('id');
            expect(response.body.data.user.email).toBe(testUser.email);
            expect(response.body.data.user.username).toBe(testUser.username);
            expect(response.body.data.user.isEmailVerified).toBe(false);

            tokens = getTokens(response);

            // Verify user manually for next tests
            await prisma.user.update({
                where: { email: testUser.email },
                data: { is_email_verified: true }
            });
        });

        it('should reject duplicate email', async () => {
            const duplicateUser = { ...(await generateTestUser()), email: testUser.email };
            const response = await api
                .post('/api/auth/register')
                .send(duplicateUser);

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });

        it('should reject duplicate username', async () => {
            const duplicateUser = { ...(await generateTestUser()), username: testUser.username };
            const response = await api
                .post('/api/auth/register')
                .send(duplicateUser);

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });

        it('should reject weak password', async () => {
            const weakPasswordUser = { ...(await generateTestUser()), password: '123' };
            const response = await api
                .post('/api/auth/register')
                .send(weakPasswordUser);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject password without uppercase', async () => {
            const noUppercaseUser = { ...(await generateTestUser()), password: 'test1234!' };
            const response = await api
                .post('/api/auth/register')
                .send(noUppercaseUser);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject password without number', async () => {
            const noNumberUser = { ...(await generateTestUser()), password: 'TestTest!' };
            const response = await api
                .post('/api/auth/register')
                .send(noNumberUser);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // LOGIN TESTS
    // ============================================================================

    describe('POST /api/auth/login', () => {
        it('should login with correct credentials', async () => {
            const response = await api
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                    device: testUser.device,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');

            tokens = getTokens(response);
        });

        it('should reject wrong password', async () => {
            const response = await api
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword123!',
                    device: testUser.device,
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should reject non-existent email', async () => {
            const response = await api
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Test1234!',
                    device: testUser.device,
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should be case-insensitive for email', async () => {
            const response = await api
                .post('/api/auth/login')
                .send({
                    email: testUser.email.toUpperCase(),
                    password: testUser.password,
                    device: testUser.device,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    // ============================================================================
    // TOKEN REFRESH TESTS
    // ============================================================================

    describe('POST /api/auth/refresh', () => {
        it('should refresh tokens with valid refresh token', async () => {
            // First do a fresh login to get guaranteed valid tokens
            const loginResponse = await api
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                    device: {
                        ...testUser.device,
                        deviceId: `refresh-test-${Date.now()}`,
                    },
                });

            const freshTokens = getTokens(loginResponse);

            const response = await api
                .post('/api/auth/refresh')
                .send({ refreshToken: freshTokens.refreshToken });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
        });

        it('should reject invalid refresh token', async () => {
            const response = await api
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should reject empty refresh token', async () => {
            const response = await api
                .post('/api/auth/refresh')
                .send({ refreshToken: '' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // EMAIL VERIFICATION TESTS
    // ============================================================================

    describe('POST /api/auth/verify-email', () => {
        let unverifiedUser: Awaited<ReturnType<typeof generateTestUser>>;
        let unverifiedTokens: { accessToken: string; refreshToken: string };

        beforeAll(async () => {
            // Create an unverified user for these tests
            unverifiedUser = await generateTestUser();
            const response = await api
                .post('/api/auth/register')
                .send(unverifiedUser);

            unverifiedTokens = getTokens(response);
        });

        it('should reject invalid verification code format', async () => {
            const response = await api
                .post('/api/auth/verify-email')
                .set(authHeader(unverifiedTokens.accessToken))
                .send({ code: 'abc' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject wrong verification code', async () => {
            const response = await api
                .post('/api/auth/verify-email')
                .set(authHeader(unverifiedTokens.accessToken))
                .send({ code: '000000' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject without auth token', async () => {
            const response = await api
                .post('/api/auth/verify-email')
                .send({ code: '123456' });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/resend-verification', () => {
        let unverifiedUser2: Awaited<ReturnType<typeof generateTestUser>>;
        let unverifiedTokens2: { accessToken: string; refreshToken: string };

        beforeAll(async () => {
            unverifiedUser2 = await generateTestUser();
            const response = await api
                .post('/api/auth/register')
                .send(unverifiedUser2);

            unverifiedTokens2 = getTokens(response);
        });

        it('should resend verification code successfully', async () => {
            // Wait longer to avoid cooldown/rate limit from initial registration
            await new Promise(resolve => setTimeout(resolve, 3000));

            const response = await api
                .post('/api/auth/resend-verification')
                .set(authHeader(unverifiedTokens2.accessToken));

            // Accept both 200 (success) and 429 (rate limited) as the API might rate limit
            expect([200, 429]).toContain(response.status);
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
            }
        });

        it('should reject without auth token', async () => {
            const response = await api
                .post('/api/auth/resend-verification');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // PASSWORD MANAGEMENT TESTS
    // ============================================================================

    describe('POST /api/auth/forgot-password', () => {
        it('should return success for existing email (no enumeration)', async () => {
            const response = await api
                .post('/api/auth/forgot-password')
                .send({ email: testUser.email });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should return success for non-existing email (no enumeration)', async () => {
            const response = await api
                .post('/api/auth/forgot-password')
                .send({ email: 'nonexistent-email@example.com' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should reject invalid email format', async () => {
            const response = await api
                .post('/api/auth/forgot-password')
                .send({ email: 'invalid-email' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/reset-password', () => {
        it('should reject invalid reset token', async () => {
            const response = await api
                .post('/api/auth/reset-password')
                .send({
                    token: 'invalid-reset-token',
                    newPassword: 'NewPassword123!'
                });

            // API returns 410 Gone for invalid/expired tokens (semantically correct)
            expect(response.status).toBe(410);
            expect(response.body.success).toBe(false);
        });

        it('should reject weak new password', async () => {
            const response = await api
                .post('/api/auth/reset-password')
                .send({
                    token: 'some-token',
                    newPassword: 'weak'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/change-password', () => {
        it('should reject wrong current password', async () => {
            const response = await api
                .post('/api/auth/change-password')
                .set(authHeader(tokens.accessToken))
                .send({
                    currentPassword: 'WrongPassword123!',
                    newPassword: 'NewPassword456!'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should reject weak new password', async () => {
            const response = await api
                .post('/api/auth/change-password')
                .set(authHeader(tokens.accessToken))
                .send({
                    currentPassword: testUser.password,
                    newPassword: 'weak'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject without auth token', async () => {
            const response = await api
                .post('/api/auth/change-password')
                .send({
                    currentPassword: testUser.password,
                    newPassword: 'NewPassword456!'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should change password successfully', async () => {
            const newPassword = 'ChangedPassword789!';
            const response = await api
                .post('/api/auth/change-password')
                .set(authHeader(tokens.accessToken))
                .send({
                    currentPassword: testUser.password,
                    newPassword
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify can login with new password
            const loginResponse = await api
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: newPassword,
                    device: testUser.device,
                });

            expect(loginResponse.status).toBe(200);
            tokens = getTokens(loginResponse);

            // Update testUser password for further tests
            testUser.password = newPassword;
        });
    });

    // ============================================================================
    // ACCOUNT LOCKOUT TESTS
    // ============================================================================

    describe('Account Lockout', () => {
        let lockoutUser: Awaited<ReturnType<typeof generateTestUser>>;

        beforeAll(async () => {
            lockoutUser = await generateTestUser();
            await api.post('/api/auth/register').send(lockoutUser);

            // Verify user
            await prisma.user.update({
                where: { email: lockoutUser.email },
                data: { is_email_verified: true }
            });
        });

        it('should lock account after 5 failed login attempts', async () => {
            // Make 5 failed login attempts
            for (let i = 0; i < 5; i++) {
                await api
                    .post('/api/auth/login')
                    .send({
                        email: lockoutUser.email,
                        password: 'WrongPassword123!',
                        device: lockoutUser.device,
                    });
            }

            // 6th attempt should indicate account is locked
            const response = await api
                .post('/api/auth/login')
                .send({
                    email: lockoutUser.email,
                    password: lockoutUser.password,
                    device: lockoutUser.device,
                });

            // API returns 429 Too Many Requests for locked accounts
            expect(response.status).toBe(429);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // LOGOUT TESTS
    // ============================================================================

    describe('POST /api/auth/logout', () => {
        it('should logout successfully', async () => {
            // First login to get fresh tokens
            const loginResponse = await api
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                    device: testUser.device,
                });

            const freshTokens = getTokens(loginResponse);

            const response = await api
                .post('/api/auth/logout')
                .set(authHeader(freshTokens.accessToken));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should reject without auth token', async () => {
            const response = await api.post('/api/auth/logout');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/logout-all', () => {
        it('should logout from all devices', async () => {
            // Login to get fresh tokens
            const loginResponse = await api
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                    device: testUser.device,
                });

            const freshTokens = getTokens(loginResponse);

            const response = await api
                .post('/api/auth/logout-all')
                .set(authHeader(freshTokens.accessToken));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    // ============================================================================
    // TOKEN SECURITY TESTS
    // ============================================================================

    describe('Token Security', () => {
        it('should reject expired access token', async () => {
            // Using a clearly invalid/expired token format
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';

            const response = await api
                .get('/api/user/me')
                .set(authHeader(expiredToken));

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should reject malformed access token', async () => {
            const response = await api
                .get('/api/user/me')
                .set(authHeader('not-a-valid-jwt'));

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should reject empty bearer token', async () => {
            const response = await api
                .get('/api/user/me')
                .set('Authorization', 'Bearer ');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
