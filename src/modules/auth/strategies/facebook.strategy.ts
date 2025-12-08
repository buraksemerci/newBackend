import { env } from '../../../config/env.js';
import { ExternalProvider } from '../../../types/index.js';

interface FacebookUserInfo {
    email: string;
    providerKey: string;
    provider: ExternalProvider;
    name?: string;
    picture?: string;
}

interface FacebookDebugResponse {
    data: {
        app_id: string;
        user_id: string;
        is_valid: boolean;
        expires_at: number;
    };
}

interface FacebookMeResponse {
    id: string;
    email?: string;
    name?: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

/**
 * Verify Facebook access token and extract user info
 */
export const verifyFacebookToken = async (accessToken: string): Promise<FacebookUserInfo> => {
    try {
        // First, verify the token with Facebook's debug endpoint
        const debugResponse = await fetch(
            `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`
        );

        if (!debugResponse.ok) {
            throw new Error('Failed to verify Facebook token');
        }

        const debugData = await debugResponse.json() as FacebookDebugResponse;

        if (!debugData.data.is_valid) {
            throw new Error('Invalid Facebook token');
        }

        if (debugData.data.app_id !== env.FACEBOOK_APP_ID) {
            throw new Error('Token was not issued for this app');
        }

        // Get user info from Facebook Graph API
        const userResponse = await fetch(
            `https://graph.facebook.com/me?fields=id,email,name,picture&access_token=${accessToken}`
        );

        if (!userResponse.ok) {
            throw new Error('Failed to fetch Facebook user info');
        }

        const userData = await userResponse.json() as FacebookMeResponse;

        if (!userData.id) {
            throw new Error('Invalid Facebook user data');
        }

        return {
            email: userData.email || '',
            providerKey: userData.id,
            provider: ExternalProvider.FACEBOOK,
            name: userData.name,
            picture: userData.picture?.data?.url,
        };
    } catch (error) {
        throw new Error(`Facebook token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
