import { api, generateTestUser, getTokens, authHeader } from '../helpers.js';
import { prisma } from '../../src/config/index.js';
import bcrypt from 'bcryptjs';
import { uuidv7 } from 'uuidv7';

describe('Device Endpoints', () => {
    let tokens: { accessToken: string; refreshToken: string };
    let testUser: Awaited<ReturnType<typeof generateTestUser>>;
    let currentDeviceId: string;
    let userId: string; // Declare userId here

    beforeAll(async () => {
        // Prepare test user data
        testUser = await generateTestUser();
        currentDeviceId = testUser.device.deviceId;

        // Manually create user in DB to bypass slow email sending service
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        userId = uuidv7(); // Assign to outer variable

        await prisma.user.create({
            data: {
                user_id: userId,
                email: testUser.email,
                username: testUser.username,
                is_email_verified: true,
                local_credential: {
                    create: {
                        password_hash: hashedPassword,
                    }
                },
                // Create the device we will use
                devices: {
                    create: {
                        user_device_id: uuidv7(),
                        device_id: testUser.device.deviceId,
                        device_name: testUser.device.deviceName,
                        device_type: testUser.device.deviceType as any,
                        last_active_at: new Date(),
                    }
                },
                // Create profile
                profile: {
                    create: {
                        first_name: testUser.profile.firstName,
                        last_name: testUser.profile.lastName,
                        birth_date: new Date(testUser.profile.birthDate),
                        gender: testUser.profile.gender as any,
                    }
                },
                // Create settings
                settings: {
                    create: {
                        preferred_unit: testUser.settings.preferredUnit as any,
                        language_id: testUser.settings.languageId,
                        theme: testUser.settings.theme as any
                    }
                }
            }
        });

        // Login to get valid tokens
        const loginResponse = await api
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password,
                device: testUser.device,
            });

        tokens = getTokens(loginResponse);
    });

    // ============================================================================
    // GET DEVICES TESTS
    // ============================================================================

    describe('GET /api/device', () => {
        it('should return list of active devices', async () => {
            const response = await api
                .get('/api/device')
                .set(authHeader(tokens.accessToken));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);

            const device = response.body.data[0];
            expect(device).toHaveProperty('id');
            expect(device).toHaveProperty('deviceId');
            expect(device).toHaveProperty('deviceType');
            expect(device).toHaveProperty('isCurrent');
        });

        it('should mark current device correctly', async () => {
            const response = await api
                .get('/api/device')
                .set(authHeader(tokens.accessToken));

            expect(response.status).toBe(200);

            const currentDevice = response.body.data.find((d: { isCurrent: boolean }) => d.isCurrent);
            expect(currentDevice).toBeDefined();
            expect(currentDevice.deviceId).toBe(currentDeviceId);
        });

        it('should reject without auth token', async () => {
            const response = await api.get('/api/device');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // ============================================================================
    // REMOVE DEVICE TESTS
    // ============================================================================

    describe('DELETE /api/device/:deviceId', () => {
        it('should reject removing current device', async () => {
            const response = await api
                .delete(`/api/device/${currentDeviceId}`)
                .set(authHeader(tokens.accessToken));

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject removing non-existent device', async () => {
            const response = await api
                .delete('/api/device/non-existent-device-id')
                .set(authHeader(tokens.accessToken));

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should remove another device successfully', async () => {
            const anotherDeviceId = `test-device-${Date.now()}-another`;

            // Manually create another device in DB to avoid email sending delay
            await prisma.userDevice.create({
                data: {
                    user_device_id: uuidv7(),
                    user_id: userId, // Use the stored user_id variable
                    device_id: anotherDeviceId,
                    device_name: 'Another Test Device',
                    device_type: 'ANDROID',
                    last_active_at: new Date(),
                }
            });

            // Remove that device using original session tokens
            const response = await api
                .delete(`/api/device/${anotherDeviceId}`)
                .set(authHeader(tokens.accessToken));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify device is removed
            const devicesResponse = await api
                .get('/api/device')
                .set(authHeader(tokens.accessToken));

            const removedDevice = devicesResponse.body.data.find(
                (d: { deviceId: string }) => d.deviceId === anotherDeviceId
            );
            expect(removedDevice).toBeUndefined();
        });
    });

    // ============================================================================
    // FCM TOKEN TESTS
    // ============================================================================

    describe('PATCH /api/device/fcm-token', () => {
        it('should update FCM token successfully', async () => {
            const response = await api
                .patch('/api/device/fcm-token')
                .set(authHeader(tokens.accessToken))
                .send({ fcmToken: 'new-fcm-token-12345' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should reject without FCM token', async () => {
            const response = await api
                .patch('/api/device/fcm-token')
                .set(authHeader(tokens.accessToken))
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject without auth token', async () => {
            const response = await api
                .patch('/api/device/fcm-token')
                .send({ fcmToken: 'test-token' });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
