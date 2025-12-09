import { api, generateTestUser, getTokens, authHeader } from '../helpers.js';
import { prisma } from '../../src/config/index.js';

describe('Auth Endpoints', () => {
    let testUser: Awaited<ReturnType<typeof generateTestUser>>;
    let tokens: { accessToken: string; refreshToken: string };

    beforeAll(async () => {
        testUser = await generateTestUser();
    });

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
                data: { isEmailVerified: true }
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
    });

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
    });

    describe('POST /api/auth/refresh', () => {
        it('should refresh tokens with valid refresh token', async () => {
            const response = await api
                .post('/api/auth/refresh')
                .send({ refreshToken: tokens.refreshToken });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');

            tokens = getTokens(response);
        });

        it('should reject invalid refresh token', async () => {
            const response = await api
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should logout successfully', async () => {
            const response = await api
                .post('/api/auth/logout')
                .set(authHeader(tokens.accessToken));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should reject without auth token', async () => {
            const response = await api.post('/api/auth/logout');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
