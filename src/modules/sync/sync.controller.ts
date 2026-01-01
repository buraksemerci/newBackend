import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response.util.js';
import * as syncService from './sync.service.js';

/**
 * Get static data versions
 * GET /api/sync/check
 */
export const checkVersions = async (_req: Request, res: Response): Promise<void> => {
    const versions = await syncService.getStaticDataVersions();
    sendSuccess(res, { versions });
};

/**
 * Get all static data for initial sync
 * GET /api/sync/static-data?languageId=1
 */
export const getStaticData = async (req: Request, res: Response): Promise<void> => {
    const languageId = req.query.languageId ? Number(req.query.languageId) : 1;
    const data = await syncService.getAllStaticData(languageId);
    sendSuccess(res, data);
};
