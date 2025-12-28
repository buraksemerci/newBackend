import { prisma, logger } from '../../config/index.js';
import { AppError } from '../../middleware/error.middleware.js';
import { ErrorCodes } from '../../utils/response.util.js';
import { uuidv7 } from 'uuidv7';

/**
 * Block Service - User Blocking Management
 * 
 * Implements strict blocking where blocked users become invisible (404).
 * Automatically cleans up existing connections when blocking.
 */

/**
 * Block a user (Strict Mode)
 */
export const blockUser = async (blockerId: string, blockedId: string): Promise<void> => {
    // Validate: Cannot block yourself
    if (blockerId === blockedId) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cannot block yourself', 400);
    }

    // Check if already blocked
    const existingBlock = await prisma.userBlock.findUnique({
        where: {
            blocker_id_blocked_id: { blocker_id: blockerId, blocked_id: blockedId },
        },
    });

    if (existingBlock) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'User is already blocked', 400);
    }

    // Create block
    await prisma.userBlock.create({
        data: {
            blocker_id: blockerId,
            blocked_id: blockedId,
        },
    });

    // Cleanup: Remove any existing connection
    const sortedIds = blockerId < blockedId ? [blockerId, blockedId] : [blockedId, blockerId];
    const [lowUserId, highUserId] = sortedIds;

    const existingConnection = await prisma.userConnection.findUnique({
        where: {
            low_user_id_high_user_id: { low_user_id: lowUserId, high_user_id: highUserId },
        },
    });

    if (existingConnection) {
        // Delete connection
        await prisma.userConnection.delete({
            where: { connection_id: existingConnection.connection_id },
        });

        // Update connection counts
        await updateConnectionCount(blockerId);
        await updateConnectionCount(blockedId);
    }

    logger.info('User blocked', { blockerId, blockedId });
};

/**
 * Unblock a user
 */
export const unblockUser = async (blockerId: string, blockedId: string): Promise<void> => {
    const block = await prisma.userBlock.findUnique({
        where: {
            blocker_id_blocked_id: { blocker_id: blockerId, blocked_id: blockedId },
        },
    });

    if (!block) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Block not found', 404);
    }

    await prisma.userBlock.delete({
        where: {
            blocker_id_blocked_id: { blocker_id: blockerId, blocked_id: blockedId },
        },
    });

    logger.info('User unblocked', { blockerId, blockedId });
};

/**
 * Check if user A has blocked user B
 */
export const isUserBlocked = async (userId: string, targetUserId: string): Promise<boolean> => {
    const block = await prisma.userBlock.findFirst({
        where: {
            OR: [
                { blocker_id: userId, blocked_id: targetUserId },
                { blocker_id: targetUserId, blocked_id: userId },
            ],
        },
    });

    return !!block;
};

/**
 * Get list of users the current user has blocked
 */
export const getBlockedUsers = async (userId: string): Promise<string[]> => {
    const blocks = await prisma.userBlock.findMany({
        where: { blocker_id: userId },
        select: { blocked_id: true },
    });

    return blocks.map((b) => b.blocked_id);
};

// Helper to update connection count
const updateConnectionCount = async (userId: string): Promise<void> => {
    const acceptedCount = await prisma.userConnection.count({
        where: {
            OR: [
                { low_user_id: userId, status: 'ACCEPTED' },
                { high_user_id: userId, status: 'ACCEPTED' },
            ],
        },
    });

    const pendingReceivedCount = await prisma.userConnection.count({
        where: {
            receiver_id: userId,
            status: 'PENDING',
        },
    });

    await prisma.userConnectionCount.upsert({
        where: { user_id: userId },
        create: {
            user_id: userId,
            connection_count: acceptedCount,
            pending_received_count: pendingReceivedCount,
        },
        update: {
            connection_count: acceptedCount,
            pending_received_count: pendingReceivedCount,
        },
    });
};
