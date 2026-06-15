import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/api-response.util';
import * as forecastService from './forecast.service';
import { runNightlyForecast } from '../../jobs/nightly-forecast.job';

export async function getAllForecasts(_req: Request, res: Response, next: NextFunction) {
  try {
    const forecasts = await forecastService.getAllForecasts();
    return success(res, { forecasts });
  } catch (error) {
    next(error);
  }
}

export async function getForecastByProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const forecast = await forecastService.getForecastByProduct(req.params.productId);
    return success(res, { forecast });
  } catch (error) {
    next(error);
  }
}

export async function triggerManualForecast(_req: Request, res: Response, next: NextFunction) {
  try {
    // This runs async, but we can await it or run it in background
    // Since it might take a while, we'll await it for testing purposes
    await runNightlyForecast();
    return success(res, { message: 'Nightly forecast triggered successfully' });
  } catch (error) {
    next(error);
  }
}
