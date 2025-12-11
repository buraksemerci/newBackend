import { prisma, logger, env } from '../config/index.js';

/**
 * Cleanup expired data periodically
 */
const runCleanup = async (): Promise<void> => {
    const now = new Date();
    logger.info('Starting cleanup job', { action: 'CLEANUP_START' });

    try {
        // 1. Delete expired verification tokens (both email and password reset)
        const expiredVerificationTokens = await prisma.verificationToken.deleteMany({
            where: {
                OR: [
                    { expires_at: { lt: now } },
                    { is_used: true, created_at: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
                ],
            },
        });
        logger.debug(`Deleted ${expiredVerificationTokens.count} expired verification tokens`);

        // 3. Delete expired refresh tokens
        const expiredRefreshTokens = await prisma.refreshToken.deleteMany({
            where: {
                expires_at: { lt: now },
            },
        });
        logger.debug(`Deleted ${expiredRefreshTokens.count} expired refresh tokens`);

        // 4. Delete unverified accounts older than X days
        const unverifiedCutoff = new Date(
            now.getTime() - env.UNVERIFIED_ACCOUNT_TTL_DAYS * 24 * 60 * 60 * 1000
        );
        const unverifiedUsers = await prisma.user.deleteMany({
            where: {
                is_email_verified: false,
                created_at: { lt: unverifiedCutoff },
                deleted_at: null,
            },
        });
        logger.debug(`Deleted ${unverifiedUsers.count} unverified accounts`);

        // 5. Delete inactive devices older than X days
        const inactiveCutoff = new Date(
            now.getTime() - env.INACTIVE_DEVICE_TTL_DAYS * 24 * 60 * 60 * 1000
        );
        const inactiveDevices = await prisma.userDevice.deleteMany({
            where: {
                last_active_at: { lt: inactiveCutoff },
            },
        });
        logger.debug(`Deleted ${inactiveDevices.count} inactive devices`);

        // 6. Clean up orphaned refresh tokens (devices deleted)
        const orphanedTokens = await prisma.$executeRaw`
      DELETE FROM [aaAuth].[refresh_tokens] 
      WHERE user_device_id NOT IN (SELECT user_device_id FROM [aaAuth].[user_devices])
    `;
        logger.debug(`Deleted ${orphanedTokens} orphaned refresh tokens`);

        logger.info('Cleanup job completed successfully', {
            action: 'CLEANUP_COMPLETE',
            stats: {
                expiredVerificationTokens: expiredVerificationTokens.count,
                expiredRefreshTokens: expiredRefreshTokens.count,
                unverifiedUsers: unverifiedUsers.count,
                inactiveDevices: inactiveDevices.count,
            },
        });
    } catch (error) {
        logger.error('Cleanup job failed', {
            action: 'CLEANUP_FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Setup the cleanup job to run at specified intervals
 */
export const setupCleanupJob = (): void => {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }

    // Run immediately on startup
    runCleanup();

    // Then run at specified intervals
    cleanupInterval = setInterval(runCleanup, env.CLEANUP_INTERVAL_MS);

    logger.info(`Cleanup job scheduled to run every ${env.CLEANUP_INTERVAL_MS / 1000 / 60} minutes`);
};

/**
 * Stop the cleanup job
 */
export const stopCleanupJob = (): void => {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        logger.info('Cleanup job stopped');
    }
};

/**
 * Run cleanup job manually (for testing)
 */
export const runCleanupManually = async (): Promise<void> => {
    await runCleanup();
};
