import mongoose, { Schema, Document } from 'mongoose';

export interface IWasteRiskItem {
  batch_no: string;
  qty: number;
  expiry_date: Date;
  risk_level: 'High' | 'Medium' | 'Low';
}

export interface IForecast extends Document {
  productId: mongoose.Types.ObjectId;
  generatedAt: Date;
  predictedDemand: number;
  currentStock: number;
  confidence: number;
  recommendedOrderQty: number;
  wasteRiskItems: IWasteRiskItem[];
}

const wasteRiskItemSchema = new Schema<IWasteRiskItem>({
  batch_no: { type: String, required: true },
  qty: { type: Number, required: true },
  expiry_date: { type: Date, required: true },
  risk_level: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
});

const forecastSchema = new Schema<IForecast>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true, // Upsert based on this
  },
  generatedAt: { type: Date, default: Date.now },
  predictedDemand: { type: Number, required: true, default: 0 },
  currentStock: { type: Number, required: true, default: 0 },
  confidence: { type: Number, required: true, default: 0 },
  recommendedOrderQty: { type: Number, required: true, default: 0 },
  wasteRiskItems: { type: [wasteRiskItemSchema], default: [] },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret: any) {
      delete ret.__v;
      return ret;
    },
  },
});

export const Forecast = mongoose.model<IForecast>('Forecast', forecastSchema);
