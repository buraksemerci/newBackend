import { Router } from 'express';
import * as publicController from './public.controller.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { createRateLimiter, RateLimitConfigs } from '../../utils/rateLimiter.util.js';

const router = Router();

// Rate limiter for username checks
const usernameCheckLimiter = createRateLimiter(RateLimitConfigs.checkUsername);

// Goal types
router.get('/fitness-goals', asyncHandler(publicController.getFitnessGoals));

// Body targets (requires gender query param)
router.get('/body-targets', asyncHandler(publicController.getBodyTargets));

// Health limitations
router.get('/health-limitations', asyncHandler(publicController.getHealthLimitations));

// Equipment
router.get('/equipment', asyncHandler(publicController.getEquipment));

// Username availability check (with rate limiting)
router.get('/check-username/:username', usernameCheckLimiter, asyncHandler(publicController.checkUsername));

// Email availability check (with rate limiting)
router.get('/check-email/:email', usernameCheckLimiter, asyncHandler(publicController.checkEmail));

// Available languages
router.get('/languages', asyncHandler(publicController.getLanguages));

// Exercise categories
router.get('/exercise-categories', asyncHandler(publicController.getExerciseCategories));

// Movement patterns
router.get('/movement-patterns', asyncHandler(publicController.getMovementPatterns));

// Muscles
router.get('/muscles', asyncHandler(publicController.getMuscles));

// Exercises
router.get('/exercises', asyncHandler(publicController.getExercises));

export default router;
