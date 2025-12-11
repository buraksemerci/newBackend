import { Request, Response } from 'express';
import { ExternalProvider } from '../../types/index.js';
import { sendSuccess, sendError, ErrorCodes } from '../../utils/response.util.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import * as authService from './auth.service.js';
import {
    RegisterInput,
    SocialRegisterInput,
    LoginInput,
    SocialLoginInput,
    VerifyEmailInput,
    ForgotPasswordInput,
    ResetPasswordInput,
    ChangePasswordInput,
    RefreshTokenInput,
    LinkSocialInput,
    ConfirmMergeInput,
} from './auth.schemas.js';
import { verifyGoogleToken, verifyAppleToken, verifyFacebookToken } from './strategies/index.js';

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Register with email and password
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as RegisterInput;
    const result = await authService.registerUser(input);
    sendSuccess(res, result, 'Registration successful. Please verify your email.', 201);
};

/**
 * Register with social provider
 * POST /api/auth/social/register
 */
export const socialRegister = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as SocialRegisterInput;

    // Verify social token
    const socialData = await verifySocialToken(input.provider as ExternalProvider, input.providerToken);

    if (!socialData.email) {
        sendError(res, ErrorCodes.SOCIAL_AUTH_FAILED, 'Email is required for registration', 400);
        return;
    }

    const result = await authService.registerWithSocial(input, socialData);
    sendSuccess(res, result, 'Registration successful', 201);
};

// ============================================================================
// LOGIN
// ============================================================================

/**
 * Login with email and password
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as LoginInput;
    const result = await authService.loginWithEmail(input);
    sendSuccess(res, result, 'Login successful');
};

/**
 * Login with social provider (Google)
 * POST /api/auth/social/google
 */
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as SocialLoginInput;

    const socialData = await verifySocialToken(ExternalProvider.GOOGLE, input.providerToken);

    if (!socialData.email) {
        sendError(res, ErrorCodes.SOCIAL_AUTH_FAILED, 'Could not get email from Google', 400);
        return;
    }

    const result = await authService.loginWithSocial(input, socialData);

    if ('requiresMerge' in result) {
        sendSuccess(res, {
            requiresMerge: true,
            email: result.email,
            message: 'An account with this email already exists. Would you like to link your Google account?',
        });
        return;
    }

    sendSuccess(res, result, 'Login successful');
};

/**
 * Login with social provider (Apple)
 * POST /api/auth/social/apple
 */
export const appleLogin = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as SocialLoginInput;

    const socialData = await verifySocialToken(ExternalProvider.APPLE, input.providerToken);

    // Apple might not return email on subsequent logins
    const result = await authService.loginWithSocial(input, socialData);

    if ('requiresMerge' in result) {
        sendSuccess(res, {
            requiresMerge: true,
            email: result.email,
            message: 'An account with this email already exists. Would you like to link your Apple account?',
        });
        return;
    }

    sendSuccess(res, result, 'Login successful');
};

/**
 * Login with social provider (Facebook)
 * POST /api/auth/social/facebook
 */
export const facebookLogin = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as SocialLoginInput;

    const socialData = await verifySocialToken(ExternalProvider.FACEBOOK, input.providerToken);

    if (!socialData.email) {
        sendError(res, ErrorCodes.SOCIAL_AUTH_FAILED, 'Could not get email from Facebook', 400);
        return;
    }

    const result = await authService.loginWithSocial(input, socialData);

    if ('requiresMerge' in result) {
        sendSuccess(res, {
            requiresMerge: true,
            email: result.email,
            message: 'An account with this email already exists. Would you like to link your Facebook account?',
        });
        return;
    }

    sendSuccess(res, result, 'Login successful');
};

/**
 * Confirm account merge
 * POST /api/auth/confirm-merge
 */
export const confirmMerge = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as ConfirmMergeInput;

    if (!input.confirmMerge) {
        sendError(res, ErrorCodes.VALIDATION_ERROR, 'Merge not confirmed', 400);
        return;
    }

    const socialData = await verifySocialToken(input.provider as ExternalProvider, input.providerToken);

    // Find user by email
    const { prisma } = await import('../../config/database.js');
    const user = await prisma.user.findUnique({
        where: { email: socialData.email },
    });

    if (!user) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }

    const result = await authService.mergeSocialAccount(
        user.user_id,
        { provider: socialData.provider, providerKey: socialData.providerKey },
        input.device
    );

    sendSuccess(res, result, 'Account merged successfully');
};

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

/**
 * Verify email with 6-digit code
 * POST /api/auth/verify-email
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { code } = req.body as VerifyEmailInput;

    await authService.verifyEmail(authReq.userId, code);
    sendSuccess(res, null, 'Email verified successfully');
};

/**
 * Resend verification code
 * POST /api/auth/resend-verification
 */
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    const result = await authService.resendVerificationCode(authReq.userId);
    sendSuccess(res, result, 'Verification code sent');
};

// ============================================================================
// PASSWORD MANAGEMENT
// ============================================================================

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as ForgotPasswordInput;

    await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    sendSuccess(res, null, 'If an account exists with this email, a password reset link has been sent');
};

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body as ResetPasswordInput;

    await authService.resetPassword(token, newPassword);
    sendSuccess(res, null, 'Password reset successful. You can now login with your new password.');
};

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { currentPassword, newPassword } = req.body as ChangePasswordInput;

    await authService.changePassword(authReq.userId, currentPassword, newPassword);
    sendSuccess(res, null, 'Password changed successfully. Please login again on all devices.');
};

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as RefreshTokenInput;

    const result = await authService.refreshTokens(refreshToken);
    sendSuccess(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
    });
};

/**
 * Logout from current device
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    await authService.logout(authReq.userId, authReq.deviceId);
    sendSuccess(res, null, 'Logged out successfully');
};

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    await authService.logoutAllDevices(authReq.userId);
    sendSuccess(res, null, 'Logged out from all devices');
};

// ============================================================================
// SOCIAL ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Link social account
 * POST /api/auth/link-social
 */
export const linkSocial = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { provider, providerToken } = req.body as LinkSocialInput;

    const socialData = await verifySocialToken(provider as ExternalProvider, providerToken);

    await authService.linkSocialAccount(authReq.userId, socialData.provider, socialData.providerKey);
    sendSuccess(res, null, `${provider} account linked successfully`);
};

/**
 * Unlink social account
 * DELETE /api/auth/unlink-social/:provider
 */
export const unlinkSocial = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const provider = req.params.provider.toUpperCase() as ExternalProvider;

    if (!['GOOGLE', 'APPLE', 'FACEBOOK'].includes(provider)) {
        sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid provider', 400);
        return;
    }

    await authService.unlinkSocialAccount(authReq.userId, provider);
    sendSuccess(res, null, `${provider} account unlinked`);
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verify social provider token
 */
const verifySocialToken = async (
    provider: ExternalProvider,
    token: string
): Promise<{ email: string; providerKey: string; provider: ExternalProvider }> => {
    try {
        switch (provider) {
            case ExternalProvider.GOOGLE:
                return await verifyGoogleToken(token);
            case ExternalProvider.APPLE:
                return await verifyAppleToken(token);
            case ExternalProvider.FACEBOOK:
                return await verifyFacebookToken(token);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    } catch (error) {
        throw new AppError(
            ErrorCodes.SOCIAL_AUTH_FAILED,
            error instanceof Error ? error.message : 'Social authentication failed',
            401
        );
    }
};
