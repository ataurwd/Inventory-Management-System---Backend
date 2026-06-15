import { Request, Response, NextFunction } from 'express';
import * as dashboardService from './dashboard.service';
import { success } from '../../utils/api-response.util';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await dashboardService.getStats();
    return success(res, stats);
  } catch (error) {
    next(error);
  }
}

export async function getDashboardWasteRisk(req: Request, res: Response, next: NextFunction) {
  try {
    const wasteRisk = await dashboardService.getWasteRisk();
    return success(res, wasteRisk);
  } catch (error) {
    next(error);
  }
}
