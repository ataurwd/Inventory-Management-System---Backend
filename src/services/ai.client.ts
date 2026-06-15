import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface ForecastResponse {
  predicted_demand: number;
  confidence: number;
  message?: string;
}

export async function getProductForecast(productId: string, daysHistory: number = 90): Promise<ForecastResponse | null> {
  try {
    const aiServiceUrl = env.AI_SERVICE_URL || 'http://ai-service:5001';
    
    const response = await axios.post<ForecastResponse>(`${aiServiceUrl}/api/predict`, {
      product_id: productId,
      days_history: daysHistory
    }, { timeout: 10000 });
    
    return response.data;
  } catch (error: any) {
    logger.error(`AI Forecast failed for product ${productId}: ${error.message}`);
    return null;
  }
}
