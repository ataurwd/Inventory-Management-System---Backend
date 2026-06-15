import mongoose from 'mongoose';
import { Forecast, IForecast } from './forecast.model';
import { Product } from '../products/product.model';
import { getProductForecast } from '../../services/ai.client';
import { logger } from '../../utils/logger';

export async function getForecastByProduct(productId: string) {
  return Forecast.findOne({ productId }).populate('productId', 'name barcode unit category');
}

export async function getAllForecasts() {
  return Forecast.find().populate('productId', 'name barcode unit category');
}

export async function runForecastForProduct(productId: mongoose.Types.ObjectId | string): Promise<IForecast | null> {
  const product = await Product.findById(productId);
  if (!product) return null;

  // 1. Get AI prediction
  const aiResult = await getProductForecast(product._id.toString());
  if (!aiResult) return null;

  // 2. Calculate current stock
  const currentStock = product.batches.reduce((sum, b) => sum + b.qty, 0);

  // 3. Recommended order quantity
  const recommendedOrderQty = Math.max(0, aiResult.predicted_demand - currentStock);

  // 4. Waste risk items (simple heuristic: expiring in 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const wasteRiskItems = product.batches
    .filter(b => b.qty > 0 && b.expiry_date <= thirtyDaysFromNow)
    .map(b => {
      const daysToExpiry = Math.floor((b.expiry_date.getTime() - now.getTime()) / (1000 * 3600 * 24));
      let risk_level: 'High' | 'Medium' | 'Low' = 'Low';
      if (daysToExpiry <= 7) risk_level = 'High';
      else if (daysToExpiry <= 14) risk_level = 'Medium';
      
      return {
        batch_no: b.batch_no,
        qty: b.qty,
        expiry_date: b.expiry_date,
        risk_level,
      };
    });

  // 5. Upsert
  const forecast = await Forecast.findOneAndUpdate(
    { productId: product._id },
    {
      generatedAt: new Date(),
      predictedDemand: aiResult.predicted_demand,
      currentStock,
      confidence: aiResult.confidence,
      recommendedOrderQty,
      wasteRiskItems,
    },
    { new: true, upsert: true }
  );

  return forecast;
}
