import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '../../../config/env.js';
import { ExternalProvider } from '../../../types/index.js';

interface AppleUserInfo {
    email: string;
    providerKey: string;
    provider: ExternalProvider;
}

interface AppleJwtPayload {
    iss: string;
    aud: string;
    exp: number;
    iat: number;
    sub: string;
    email?: string;
    email_verified?: string | boolean;
}

// JWKS client for Apple's public keys
const client = jwksClient({
    jwksUri: 'https://appleid.apple.com/auth/keys',
    cache: true,
    rateLimit: true,
});

const getAppleSigningKey = async (kid: string): Promise<string> => {
    const key = await client.getSigningKey(kid);
    return key.getPublicKey();
};

/**
 * Verify Apple ID token and extract user info
 */
export const verifyAppleToken = async (identityToken: string): Promise<AppleUserInfo> => {
    try {
        // Decode the token header to get the key ID
        const decoded = jwt.decode(identityToken, { complete: true });

        if (!decoded || !decoded.header || !decoded.header.kid) {
            throw new Error('Invalid Apple token format');
        }

        // Get the signing key
        const publicKey = await getAppleSigningKey(decoded.header.kid);

        // Verify the token
        const payload = jwt.verify(identityToken, publicKey, {
            algorithms: ['RS256'],
            issuer: 'https://appleid.apple.com',
            audience: env.APPLE_CLIENT_ID,
        }) as AppleJwtPayload;

        if (!payload.sub) {
            throw new Error('Invalid Apple token payload');
        }

        // Apple might not always send email (only on first authorization)
        // The 'sub' is the stable user identifier
        return {
            email: payload.email || '',
            providerKey: payload.sub,
            provider: ExternalProvider.APPLE,
        };
    } catch (error) {
        throw new Error(`Apple token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
