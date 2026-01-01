import { Router } from 'express';
import * as syncController from './sync.controller.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { authenticate, requireVerifiedEmail } from '../../middleware/auth.middleware.js';

const router = Router();

// All sync routes require authentication and verified email
router.use(authenticate);
router.use(requireVerifiedEmail);

// Check data versions
router.get('/check', asyncHandler(syncController.checkVersions));

// Get all static data for sync
router.get('/static-data', asyncHandler(syncController.getStaticData));

export default router;
