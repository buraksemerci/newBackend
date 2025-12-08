import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../config/env.js';
import { ExternalProvider } from '../../../types/index.js';

interface GoogleUserInfo {
    email: string;
    providerKey: string;
    provider: ExternalProvider;
    name?: string;
    picture?: string;
}

let googleClient: OAuth2Client | null = null;

const getGoogleClient = (): OAuth2Client => {
    if (!googleClient) {
        if (!env.GOOGLE_CLIENT_ID) {
            throw new Error('GOOGLE_CLIENT_ID is not configured');
        }
        googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    }
    return googleClient;
};

/**
 * Verify Google ID token and extract user info
 */
export const verifyGoogleToken = async (idToken: string): Promise<GoogleUserInfo> => {
    try {
        const client = getGoogleClient();

        const ticket = await client.verifyIdToken({
            idToken,
            audience: env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email || !payload.sub) {
            throw new Error('Invalid Google token payload');
        }

        return {
            email: payload.email,
            providerKey: payload.sub,
            provider: ExternalProvider.GOOGLE,
            name: payload.name,
            picture: payload.picture,
        };
    } catch (error) {
        throw new Error(`Google token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
