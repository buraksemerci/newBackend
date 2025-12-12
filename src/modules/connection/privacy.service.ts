import { prisma, logger } from '../../config/index.js';
import { AppError } from '../../middleware/error.middleware.js';
import { ErrorCodes } from '../../utils/response.util.js';
import { ProfileVisibility, ReceiveRequestsFrom } from '../../config/social.config.js';

/**
 * Privacy Service - User Privacy Settings Management
 * 
 * Handles profile visibility and connection request preferences.
 */

export interface PrivacySettings {
    profileVisibility: ProfileVisibility;
    canReceiveRequestsFrom: ReceiveRequestsFrom;
}

/**
 * Get user's privacy settings
 */
export const getPrivacySettings = async (userId: string): Promise<PrivacySettings> => {
    const settings = await prisma.userPrivacySetting.upsert({
        where: { user_id: userId },
        create: {
            user_id: userId,
            profile_visibility: 'EVERYONE',
            can_receive_requests_from: 'EVERYONE',
        },
        update: {}, // No update needed, just return existing
    });

    return {
        profileVisibility: settings.profile_visibility as ProfileVisibility,
        canReceiveRequestsFrom: settings.can_receive_requests_from as ReceiveRequestsFrom,
    };
};

/**
 * Update user's privacy settings
 */
export const updatePrivacySettings = async (
    userId: string,
    data: Partial<PrivacySettings>
): Promise<void> => {
    const updateData: any = {};

    if (data.profileVisibility) {
        updateData.profile_visibility = data.profileVisibility;
    }

    if (data.canReceiveRequestsFrom) {
        updateData.can_receive_requests_from = data.canReceiveRequestsFrom;
    }

    await prisma.userPrivacySetting.upsert({
        where: { user_id: userId },
        create: {
            user_id: userId,
            profile_visibility: data.profileVisibility || 'EVERYONE',
            can_receive_requests_from: data.canReceiveRequestsFrom || 'EVERYONE',
        },
        update: updateData,
    });

    logger.info('Privacy settings updated', { userId, data });
};
