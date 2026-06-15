import { Product } from '../modules/products/product.model';
import * as forecastService from '../modules/forecasts/forecast.service';
import { getIO } from '../config/socket';
import { logger } from '../utils/logger';

export async function runNightlyForecast() {
  try {
    logger.info('Starting nightly forecast job...');
    const products = await Product.find({ isDeleted: false });
    
    for (const product of products) {
      await forecastService.runForecastForProduct(product._id.toString());
    }
    
    getIO()?.emit('FORECAST_READY', { 
      generatedAt: new Date(), 
      productCount: products.length 
    });
    
    logger.info('Nightly forecast job complete');
  } catch (error: any) {
    logger.error(`Nightly forecast job failed: ${error.message}`);
  }
}
