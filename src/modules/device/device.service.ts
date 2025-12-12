import { prisma, logger } from '../../config/index.js';
import { DeviceInfo, ActiveDevice, DeviceType } from '../../types/index.js';
import { sendNewDeviceAlert } from '../../services/email.service.js';
import { Prisma } from '@prisma/client';
import { AppError } from '../../middleware/error.middleware.js';
import { ErrorCodes } from '../../utils/response.util.js';
import { uuidv7 } from 'uuidv7';

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
            user_id_device_id: {
                user_id: userId,
                device_id: deviceInfo.deviceId,
            },
        },
    });

    if (existingDevice) {
        // Update existing device
        await prisma.userDevice.update({
            where: { user_device_id: existingDevice.user_device_id },
            data: {
                device_name: deviceInfo.deviceName,
                fcm_token: deviceInfo.fcmToken,
                last_active_at: new Date(),
            },
        });

        return { id: existingDevice.user_device_id, deviceId: deviceInfo.deviceId, isNew: false };
    }

    // New device - need to check limit
    const newDeviceId = uuidv7();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const currentDevices = await tx.userDevice.findMany({
            where: { user_id: userId },
            orderBy: { last_active_at: 'asc' }, // Oldest first
        });

        // If at limit, remove oldest device
        if (currentDevices.length >= MAX_DEVICES) {
            const oldestDevice = currentDevices[0];

            // Delete oldest device and its tokens
            await tx.refreshToken.deleteMany({
                where: { user_device_id: oldestDevice.user_device_id },
            });

            await tx.userDevice.delete({
                where: { user_device_id: oldestDevice.user_device_id },
            });

            logger.info('Oldest device removed due to limit', {
                userId,
                removedDeviceId: oldestDevice.device_id,
                action: 'DEVICE_LIMIT_ENFORCED',
            });
        }

        // Create new device
        await tx.userDevice.create({
            data: {
                user_device_id: newDeviceId,
                user_id: userId,
                device_id: deviceInfo.deviceId,
                device_name: deviceInfo.deviceName,
                device_type: deviceInfo.deviceType,
                fcm_token: deviceInfo.fcmToken,
            },
        });
    });

    // Fetch the created device
    const newDevice = await prisma.userDevice.findUnique({
        where: {
            user_id_device_id: {
                user_id: userId,
                device_id: deviceInfo.deviceId
            }
        }
    });

    if (!newDevice) {
        throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create device', 500);
    }

    // Send new device alert
    const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: { profile: true },
    });

    if (user) {
        await sendNewDeviceAlert(user.email, {
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
            loginTime: new Date(),
        }, user.profile?.first_name);
    }

    logger.info('New device registered', {
        userId,
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        action: 'DEVICE_REGISTERED',
    });

    return { id: newDevice.user_device_id, deviceId: deviceInfo.deviceId, isNew: true };
};

/**
 * Get all active devices for a user
 */
export const getActiveDevices = async (
    userId: string,
    currentDeviceId?: string
): Promise<ActiveDevice[]> => {
    const devices = await prisma.userDevice.findMany({
        where: { user_id: userId },
        orderBy: { last_active_at: 'desc' },
        select: {
            user_device_id: true,
            device_id: true,
            device_name: true,
            device_type: true,
            last_active_at: true,
            created_at: true,
        },
    });

    return devices.map((device) => ({
        id: device.user_device_id,
        deviceId: device.device_id,
        deviceName: device.device_name,
        deviceType: device.device_type as DeviceType,
        lastActiveAt: device.last_active_at,
        createdAt: device.created_at,
        isCurrent: device.user_device_id === currentDeviceId,
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
            user_id_device_id: {
                user_id: userId,
                device_id: deviceId,
            },
        },
    });

    if (!device) {
        throw new AppError(ErrorCodes.DEVICE_NOT_FOUND, 'Device not found', 404);
    }

    // Can't remove current device (use logout instead)
    if (device.user_device_id === currentDeviceId) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cannot remove current device. Use logout instead.', 400);
    }

    // Delete device and its tokens
    await prisma.$transaction([
        prisma.refreshToken.deleteMany({
            where: { user_device_id: device.user_device_id },
        }),
        prisma.userDevice.delete({
            where: { user_device_id: device.user_device_id },
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
            user_id: userId,
            device_id: deviceId,
        },
        data: { fcm_token: fcmToken },
    });
};

/**
 * Update device last active timestamp
 */
export const updateDeviceActivity = async (deviceId: string): Promise<void> => {
    await prisma.userDevice.update({
        where: { user_device_id: deviceId },
        data: { last_active_at: new Date() },
    });
};

/**
 * Get device count for user
 */
export const getDeviceCount = async (userId: string): Promise<number> => {
    return prisma.userDevice.count({
        where: { user_id: userId },
    });
};
