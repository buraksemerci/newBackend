import { Router } from 'express';
import * as userController from './user.controller.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { authenticate, requireVerifiedEmail } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
    updateProfileSchema,
    updateBodySchema,
    updateSettingsSchema,
    changeUsernameSchema,
    updateFitnessGoalSchema,
} from './user.schemas.js';

const router = Router();

// All user routes require authentication and verified email
router.use(authenticate);
router.use(requireVerifiedEmail);

// Get current user
router.get('/me', asyncHandler(userController.getMe));

// Update profile
router.patch(
    '/profile',
    validateBody(updateProfileSchema),
    asyncHandler(userController.updateProfile)
);

// Update body info
router.patch(
    '/body',
    validateBody(updateBodySchema),
    asyncHandler(userController.updateBody)
);

// Update settings
router.patch(
    '/settings',
    validateBody(updateSettingsSchema),
    asyncHandler(userController.updateSettings)
);

// Change username
router.patch(
    '/username',
    validateBody(changeUsernameSchema),
    asyncHandler(userController.changeUsername)
);

// Update goal
router.patch(
    '/fitness-goal',
    validateBody(updateFitnessGoalSchema),
    asyncHandler(userController.updateFitnessGoal)
);

// Get linked auth methods
router.get('/auth-methods', asyncHandler(userController.getAuthMethods));

// Delete account
router.delete('/account', asyncHandler(userController.deleteAccount));

export default router;
