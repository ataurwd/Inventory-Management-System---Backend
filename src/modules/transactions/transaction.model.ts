import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  type: 'sale' | 'restock' | 'waste';
  productId: mongoose.Types.ObjectId;
  batchNo: string;
  qty: number;
  unitPrice: number;
  total: number;
  performedBy: mongoose.Types.ObjectId;
  timestamp: Date;
  saleId?: mongoose.Types.ObjectId;
  expiryDate?: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    type: {
      type: String,
      required: true,
      enum: ['sale', 'restock', 'waste'],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    batchNo: {
      type: String,
      required: true,
      trim: true,
    },
    qty: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    saleId: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

transactionSchema.index({ productId: 1 });
transactionSchema.index({ timestamp: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
