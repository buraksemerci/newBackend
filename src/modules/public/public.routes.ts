import { Router } from 'express';
import * as publicController from './public.controller.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { createRateLimiter, RateLimitConfigs } from '../../utils/rateLimiter.util.js';

const router = Router();

// Rate limiter for username checks
const usernameCheckLimiter = createRateLimiter(RateLimitConfigs.checkUsername);

// Goal types
router.get('/goal-types', asyncHandler(publicController.getGoalTypes));

// Body targets (requires gender query param)
router.get('/body-targets', asyncHandler(publicController.getBodyTargets));

// Health limitations
router.get('/health-limitations', asyncHandler(publicController.getHealthLimitations));

// Equipment
router.get('/equipment', asyncHandler(publicController.getEquipment));

// Workout locations
router.get('/workout-locations', asyncHandler(publicController.getWorkoutLocations));

// Username availability check (with rate limiting)
router.get('/check-username/:username', usernameCheckLimiter, asyncHandler(publicController.checkUsername));

// Email availability check (with rate limiting)
router.get('/check-email/:email', usernameCheckLimiter, asyncHandler(publicController.checkEmail));

// Available languages
router.get('/languages', asyncHandler(publicController.getLanguages));

export default router;
