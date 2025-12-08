import { Router } from 'express';
import * as authController from './auth.controller.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { createRateLimiter, RateLimitConfigs } from '../../utils/rateLimiter.util.js';
import {
    registerSchema,
    socialRegisterSchema,
    loginSchema,
    socialLoginSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    refreshTokenSchema,
    linkSocialSchema,
    confirmMergeSchema,
} from './auth.schemas.js';

const router = Router();

// Rate limiters
const loginLimiter = createRateLimiter(RateLimitConfigs.login);
const registerLimiter = createRateLimiter(RateLimitConfigs.register);
const forgotPasswordLimiter = createRateLimiter(RateLimitConfigs.forgotPassword);
const verifyCodeLimiter = createRateLimiter(RateLimitConfigs.verifyCode);
const resendLimiter = createRateLimiter(RateLimitConfigs.resendVerification);

// ============================================================================
// REGISTRATION
// ============================================================================

// Local registration
router.post(
    '/register',
    registerLimiter,
    validateBody(registerSchema),
    asyncHandler(authController.register)
);

// Social registration
router.post(
    '/social/register',
    registerLimiter,
    validateBody(socialRegisterSchema),
    asyncHandler(authController.socialRegister)
);

// ============================================================================
// LOGIN
// ============================================================================

// Local login
router.post(
    '/login',
    loginLimiter,
    validateBody(loginSchema),
    asyncHandler(authController.login)
);

// Social logins
router.post(
    '/social/google',
    loginLimiter,
    validateBody(socialLoginSchema),
    asyncHandler(authController.googleLogin)
);

router.post(
    '/social/apple',
    loginLimiter,
    validateBody(socialLoginSchema),
    asyncHandler(authController.appleLogin)
);

router.post(
    '/social/facebook',
    loginLimiter,
    validateBody(socialLoginSchema),
    asyncHandler(authController.facebookLogin)
);

// Confirm merge
router.post(
    '/confirm-merge',
    loginLimiter,
    validateBody(confirmMergeSchema),
    asyncHandler(authController.confirmMerge)
);

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

router.post(
    '/verify-email',
    authenticate,
    verifyCodeLimiter,
    validateBody(verifyEmailSchema),
    asyncHandler(authController.verifyEmail)
);

router.post(
    '/resend-verification',
    authenticate,
    resendLimiter,
    asyncHandler(authController.resendVerification)
);

// ============================================================================
// PASSWORD
// ============================================================================

router.post(
    '/forgot-password',
    forgotPasswordLimiter,
    validateBody(forgotPasswordSchema),
    asyncHandler(authController.forgotPassword)
);

router.post(
    '/reset-password',
    validateBody(resetPasswordSchema),
    asyncHandler(authController.resetPassword)
);

router.post(
    '/change-password',
    authenticate,
    validateBody(changePasswordSchema),
    asyncHandler(authController.changePassword)
);

// ============================================================================
// TOKEN
// ============================================================================

router.post(
    '/refresh',
    validateBody(refreshTokenSchema),
    asyncHandler(authController.refreshToken)
);

router.post('/logout', authenticate, asyncHandler(authController.logout));

router.post('/logout-all', authenticate, asyncHandler(authController.logoutAll));

// ============================================================================
// SOCIAL ACCOUNT MANAGEMENT
// ============================================================================

router.post(
    '/link-social',
    authenticate,
    validateBody(linkSocialSchema),
    asyncHandler(authController.linkSocial)
);

router.delete('/unlink-social/:provider', authenticate, asyncHandler(authController.unlinkSocial));

export default router;
