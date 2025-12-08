import { prisma, logger } from '../../config/index.js';
import { DeviceInfo, ActiveDevice, DeviceType } from '../../types/index.js';
import { sendNewDeviceAlert } from '../../services/email.service.js';
import { getClientIp } from '../../utils/rateLimiter.util.js';

const MAX_DEVICES = 3;

/**
 * Register a new device or update existing one
 * Enforces max device limit
 */
export const registerOrUpdateDevice = async (
    userId: string,
    deviceInfo: DeviceInfo
): Promise<{ id: string; deviceId: string; isNew: boolean }> => {
    // Check if device already exists
    const existingDevice = await prisma.userDevice.findUnique({
        where: {
            userId_deviceId: {
                userId,
                deviceId: deviceInfo.deviceId,
            },
        },
    });

    if (existingDevice) {
        // Update existing device
        await prisma.userDevice.update({
            where: { id: existingDevice.id },
            data: {
                deviceName: deviceInfo.deviceName,
                fcmToken: deviceInfo.fcmToken,
                lastActiveAt: new Date(),
            },
        });

        return { id: existingDevice.id, deviceId: deviceInfo.deviceId, isNew: false };
    }

    // New device - need to check limit
    const currentDevices = await prisma.userDevice.findMany({
        where: { userId },
        orderBy: { lastActiveAt: 'asc' }, // Oldest first
    });

    // If at limit, remove oldest device
    if (currentDevices.length >= MAX_DEVICES) {
        const oldestDevice = currentDevices[0];

        // Delete oldest device and its tokens
        await prisma.$transaction([
            prisma.refreshToken.deleteMany({
                where: { deviceId: oldestDevice.id },
            }),
            prisma.userDevice.delete({
                where: { id: oldestDevice.id },
            }),
        ]);

        logger.info('Oldest device removed due to limit', {
            userId,
            removedDeviceId: oldestDevice.deviceId,
            action: 'DEVICE_LIMIT_ENFORCED',
        });
    }

    // Create new device
    const newDevice = await prisma.userDevice.create({
        data: {
            userId,
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
            fcmToken: deviceInfo.fcmToken,
        },
    });

    // Send new device alert
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
    });

    if (user) {
        await sendNewDeviceAlert(user.email, {
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
            loginTime: new Date(),
        }, user.profile?.firstName);
    }

    logger.info('New device registered', {
        userId,
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        action: 'DEVICE_REGISTERED',
    });

    return { id: newDevice.id, deviceId: deviceInfo.deviceId, isNew: true };
};

/**
 * Get all active devices for a user
 */
export const getActiveDevices = async (
    userId: string,
    currentDeviceId?: string
): Promise<ActiveDevice[]> => {
    const devices = await prisma.userDevice.findMany({
        where: { userId },
        orderBy: { lastActiveAt: 'desc' },
        select: {
            id: true,
            deviceId: true,
            deviceName: true,
            deviceType: true,
            lastActiveAt: true,
            createdAt: true,
        },
    });

    return devices.map((device: { id: string; deviceId: string; deviceName: string | null; deviceType: string; lastActiveAt: Date; createdAt: Date }) => ({
        ...device,
        deviceType: device.deviceType as DeviceType,
        isCurrent: device.deviceId === currentDeviceId,
    }));
};

/**
 * Remove a device
 */
export const removeDevice = async (
    userId: string,
    deviceId: string,
    currentDeviceId?: string
): Promise<void> => {
    const device = await prisma.userDevice.findUnique({
        where: {
            userId_deviceId: {
                userId,
                deviceId,
            },
        },
    });

    if (!device) {
        throw new Error('Device not found');
    }

    // Can't remove current device (use logout instead)
    if (deviceId === currentDeviceId) {
        throw new Error('Cannot remove current device. Use logout instead.');
    }

    // Delete device and its tokens
    await prisma.$transaction([
        prisma.refreshToken.deleteMany({
            where: { deviceId: device.id },
        }),
        prisma.userDevice.delete({
            where: { id: device.id },
        }),
    ]);

    logger.info('Device removed', {
        userId,
        deviceId,
        action: 'DEVICE_REMOVED',
    });
};

/**
 * Update device FCM token
 */
export const updateFcmToken = async (
    userId: string,
    deviceId: string,
    fcmToken: string
): Promise<void> => {
    await prisma.userDevice.updateMany({
        where: {
            userId,
            deviceId,
        },
        data: { fcmToken },
    });
};

/**
 * Update device last active timestamp
 */
export const updateDeviceActivity = async (deviceId: string): Promise<void> => {
    await prisma.userDevice.update({
        where: { id: deviceId },
        data: { lastActiveAt: new Date() },
    });
};

/**
 * Get device count for user
 */
export const getDeviceCount = async (userId: string): Promise<number> => {
    return prisma.userDevice.count({
        where: { userId },
    });
};
