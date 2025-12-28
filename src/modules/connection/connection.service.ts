import { prisma, logger } from '../../config/index.js';
import { AppError } from '../../middleware/error.middleware.js';
import { ErrorCodes } from '../../utils/response.util.js';
import { SOCIAL_CONFIG, ConnectionStatus } from '../../config/social.config.js';
import { uuidv7 } from 'uuidv7';

/**
 * Connection Service - Social Connection Management
 * 
 * Handles friend requests, connections, and related business logic.
 * Implements "Smart Merge" for race conditions and proactive cleanup.
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sort two user IDs alphabetically to ensure consistent ordering
 */
const sortUserIds = (userId1: string, userId2: string): [string, string] => {
    return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
};

/**
 * Check if user is blocked by another user
 */
const isBlocked = async (userId1: string, userId2: string): Promise<boolean> => {
    const block = await prisma.userBlock.findFirst({
        where: {
            OR: [
                { blocker_id: userId1, blocked_id: userId2 },
                { blocker_id: userId2, blocked_id: userId1 },
            ],
        },
    });
    return !!block;
};

/**
 * Get user's privacy settings (with defaults)
 */
const getPrivacySettings = async (userId: string) => {
    let privacy = await prisma.userPrivacySetting.findUnique({
        where: { user_id: userId },
    });

    if (!privacy) {
        // Create default privacy settings if not exist
        privacy = await prisma.userPrivacySetting.create({
            data: {
                user_id: userId,
                profile_visibility: SOCIAL_CONFIG.DEFAULT_PROFILE_VISIBILITY,
                can_receive_requests_from: SOCIAL_CONFIG.DEFAULT_CAN_RECEIVE_REQUESTS_FROM,
            },
        });
    }

    return privacy;
};

/**
 * Update connection counts for a user
 */
const updateConnectionCounts = async (userId: string): Promise<void> => {
    const acceptedCount = await prisma.userConnection.count({
        where: {
            OR: [
                { low_user_id: userId, status: 'ACCEPTED' },
                { high_user_id: userId, status: 'ACCEPTED' },
            ],
        },
    });

    const [lowUserId, highUserId] = sortUserIds(userId, userId);

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

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Send a connection request (with Smart Merge for race conditions)
 */
export const sendRequest = async (requesterId: string, receiverId: string): Promise<{ status: ConnectionStatus; message: string }> => {
    // Validate: Cannot request yourself
    if (requesterId === receiverId) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cannot send request to yourself', 400);
    }

    // Check block status
    if (await isBlocked(requesterId, receiverId)) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404); // Strict mode: return 404
    }

    // Check receiver's privacy settings
    const receiverPrivacy = await getPrivacySettings(receiverId);
    if (receiverPrivacy.can_receive_requests_from === 'NOBODY') {
        throw new AppError(ErrorCodes.FORBIDDEN, 'User is not accepting connection requests', 403);
    }

    // Check requester's limits
    const requesterCounts = await prisma.userConnectionCount.findUnique({
        where: { user_id: requesterId },
    });

    if (requesterCounts) {
        if (requesterCounts.connection_count >= SOCIAL_CONFIG.MAX_CONNECTIONS) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Maximum connection limit reached', 400);
        }
    }

    // Sort IDs for uniqueness
    const [lowUserId, highUserId] = sortUserIds(requesterId, receiverId);

    // Check existing connection
    const existingConnection = await prisma.userConnection.findUnique({
        where: {
            low_user_id_high_user_id: { low_user_id: lowUserId, high_user_id: highUserId },
        },
    });

    if (existingConnection) {
        // SMART MERGE: If PENDING and initiated by the OTHER person, auto-accept!
        if (existingConnection.status === 'PENDING' && existingConnection.requester_id !== requesterId) {
            // Auto-accept (Smart Merge)
            await prisma.userConnection.update({
                where: { connection_id: existingConnection.connection_id },
                data: {
                    status: 'ACCEPTED',
                    responded_at: new Date(),
                },
            });

            // Update counts for both users
            await updateConnectionCounts(requesterId);
            await updateConnectionCounts(receiverId);

            logger.info('Smart Merge: Connection auto-accepted', { requesterId, receiverId });

            return { status: 'ACCEPTED', message: 'Connection accepted (Smart Merge)' };
        }

        // Already sent request
        if (existingConnection.status === 'PENDING' && existingConnection.requester_id === requesterId) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Request already sent', 400);
        }

        // Already connected
        if (existingConnection.status === 'ACCEPTED') {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Already connected', 400);
        }

        // Declined: Check cooldown
        if (existingConnection.status === 'DECLINED') {
            if (existingConnection.declined_until && new Date() < existingConnection.declined_until) {
                const daysLeft = Math.ceil((existingConnection.declined_until.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                throw new AppError(
                    ErrorCodes.VALIDATION_ERROR,
                    `Cannot send request yet. Please wait ${daysLeft} more day(s)`,
                    400
                );
            }

            // Cooldown expired, update to PENDING
            await prisma.userConnection.update({
                where: { connection_id: existingConnection.connection_id },
                data: {
                    status: 'PENDING',
                    requester_id: requesterId,
                    receiver_id: receiverId,
                    created_at: new Date(),
                    responded_at: null,
                    declined_until: null,
                },
            });

            await updateConnectionCounts(receiverId);

            return { status: 'PENDING', message: 'Connection request sent' };
        }
    }

    // Create new connection
    const connectionId = uuidv7();
    await prisma.userConnection.create({
        data: {
            connection_id: connectionId,
            low_user_id: lowUserId,
            high_user_id: highUserId,
            requester_id: requesterId,
            receiver_id: receiverId,
            status: 'PENDING',
        },
    });

    await updateConnectionCounts(receiverId);

    logger.info('Connection request sent', { requesterId, receiverId, connectionId });

    return { status: 'PENDING', message: 'Connection request sent' };
};

/**
 * Accept a connection request
 */
export const acceptRequest = async (userId: string, requesterId: string): Promise<void> => {
    const [lowUserId, highUserId] = sortUserIds(userId, requesterId);

    const connection = await prisma.userConnection.findUnique({
        where: {
            low_user_id_high_user_id: { low_user_id: lowUserId, high_user_id: highUserId },
        },
    });

    if (!connection || connection.status !== 'PENDING') {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Connection request not found', 404);
    }

    // Ensure the user is the receiver (not the requester)
    if (connection.requester_id === userId) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cannot accept your own request', 400);
    }

    await prisma.userConnection.update({
        where: { connection_id: connection.connection_id },
        data: {
            status: 'ACCEPTED',
            responded_at: new Date(),
        },
    });

    // Update counts for both users
    await updateConnectionCounts(userId);
    await updateConnectionCounts(requesterId);

    logger.info('Connection accepted', { userId, requesterId });
};

/**
 * Decline a connection request
 */
export const declineRequest = async (userId: string, requesterId: string): Promise<void> => {
    const [lowUserId, highUserId] = sortUserIds(userId, requesterId);

    const connection = await prisma.userConnection.findUnique({
        where: {
            low_user_id_high_user_id: { low_user_id: lowUserId, high_user_id: highUserId },
        },
    });

    if (!connection || connection.status !== 'PENDING') {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Connection request not found', 404);
    }

    // Ensure the user is the receiver
    if (connection.requester_id === userId) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cannot decline your own request', 400);
    }

    const declinedUntil = new Date();
    declinedUntil.setDate(declinedUntil.getDate() + SOCIAL_CONFIG.DECLINE_COOLDOWN_DAYS);

    await prisma.userConnection.update({
        where: { connection_id: connection.connection_id },
        data: {
            status: 'DECLINED',
            responded_at: new Date(),
            declined_until: declinedUntil,
        },
    });

    await updateConnectionCounts(userId);

    logger.info('Connection declined', { userId, requesterId });
};

/**
 * Remove an existing connection
 */
export const removeConnection = async (userId: string, otherUserId: string): Promise<void> => {
    const [lowUserId, highUserId] = sortUserIds(userId, otherUserId);

    const connection = await prisma.userConnection.findUnique({
        where: {
            low_user_id_high_user_id: { low_user_id: lowUserId, high_user_id: highUserId },
        },
    });

    if (!connection || connection.status !== 'ACCEPTED') {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Connection not found', 404);
    }

    await prisma.userConnection.delete({
        where: { connection_id: connection.connection_id },
    });

    // Update counts
    await updateConnectionCounts(userId);
    await updateConnectionCounts(otherUserId);

    logger.info('Connection removed', { userId, otherUserId });
};

/**
 * Cancel a pending outgoing request
 */
export const cancelRequest = async (userId: string, receiverId: string): Promise<void> => {
    const [lowUserId, highUserId] = sortUserIds(userId, receiverId);

    const connection = await prisma.userConnection.findUnique({
        where: {
            low_user_id_high_user_id: { low_user_id: lowUserId, high_user_id: highUserId },
        },
    });

    if (!connection || connection.status !== 'PENDING') {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Connection request not found', 404);
    }

    // Ensure the user is the requester
    if (connection.requester_id !== userId) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cannot cancel a request you did not send', 400);
    }

    await prisma.userConnection.delete({
        where: { connection_id: connection.connection_id },
    });

    await updateConnectionCounts(receiverId);

    logger.info('Connection request cancelled', { userId, receiverId });
};

/**
 * Proactive Cleanup: Remove all connections for a user (for soft delete)
 */
export const cleanupUserConnections = async (userId: string): Promise<void> => {
    const connections = await prisma.userConnection.findMany({
        where: {
            OR: [
                { low_user_id: userId },
                { high_user_id: userId },
            ],
        },
    });

    await prisma.userConnection.deleteMany({
        where: {
            OR: [
                { low_user_id: userId },
                { high_user_id: userId },
            ],
        },
    });

    logger.info('User connections cleaned up', { userId, count: connections.length });
};
