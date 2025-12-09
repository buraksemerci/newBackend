import { Request, Response } from 'express';
import { Gender } from '../../types/index.js';
import { sendSuccess, sendError, ErrorCodes } from '../../utils/response.util.js';
import * as publicService from './public.service.js';

/**
 * Get fitness goals
 * GET /api/public/fitness-goals
 */
export const getFitnessGoals = async (req: Request, res: Response): Promise<void> => {
    const language = (req.query.lang as string) || 'en';
    const fitnessGoals = await publicService.getFitnessGoals(language);
    sendSuccess(res, fitnessGoals);
};

/**
 * Get body targets by gender
 * GET /api/public/body-targets?gender=MALE|FEMALE
 */
export const getBodyTargets = async (req: Request, res: Response): Promise<void> => {
    const gender = req.query.gender as Gender;
    const language = (req.query.lang as string) || 'en';

    if (!gender || !['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
        sendError(res, ErrorCodes.VALIDATION_ERROR, 'Valid gender parameter is required (MALE, FEMALE, OTHER)', 400);
        return;
    }

    const bodyTargets = await publicService.getBodyTargets(gender, language);
    sendSuccess(res, bodyTargets);
};

/**
 * Get health limitations
 * GET /api/public/health-limitations
 */
export const getHealthLimitations = async (req: Request, res: Response): Promise<void> => {
    const language = (req.query.lang as string) || 'en';
    const limitations = await publicService.getHealthLimitations(language);
    sendSuccess(res, limitations);
};

/**
 * Get equipment list
 * GET /api/public/equipment
 */
export const getEquipment = async (req: Request, res: Response): Promise<void> => {
    const language = (req.query.lang as string) || 'en';
    const equipment = await publicService.getEquipment(language);
    sendSuccess(res, equipment);
};

/**
 * Get workout locations
 * GET /api/public/workout-locations
 */
export const getWorkoutLocations = async (req: Request, res: Response): Promise<void> => {
    const language = (req.query.lang as string) || 'en';
    const locations = await publicService.getWorkoutLocations(language);
    sendSuccess(res, locations);
};

/**
 * Check username availability
 * GET /api/public/check-username/:username
 */
export const checkUsername = async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;

    if (!username) {
        sendError(res, ErrorCodes.VALIDATION_ERROR, 'Username is required', 400);
        return;
    }

    const result = await publicService.checkUsernameAvailability(username.toLowerCase());
    sendSuccess(res, result);
};

/**
 * Check email availability
 * GET /api/public/check-email/:email
 */
export const checkEmail = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.params;

    if (!email) {
        sendError(res, ErrorCodes.VALIDATION_ERROR, 'Email is required', 400);
        return;
    }

    const result = await publicService.checkEmailAvailability(email);
    sendSuccess(res, result);
};

/**
 * Get available languages
 * GET /api/public/languages
 */
export const getLanguages = async (req: Request, res: Response): Promise<void> => {
    const languages = await publicService.getLanguages();
    sendSuccess(res, languages);
};
