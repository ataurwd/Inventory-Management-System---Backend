import mongoose, { Schema, Document } from 'mongoose';

export interface ISoldProduct {
  productId: mongoose.Types.ObjectId;
  name: string;
  barcode: string;
  qty: number;
  unitPrice: number;
  total: number;
  batches: {
    batchNo: string;
    qty: number;
    expiryDate: Date;
  }[];
}

export interface ISale extends Document {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  saleDate: Date;
  customerName: string;
  customerPhone?: string;
  products: ISoldProduct[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  saleStatus: 'completed' | 'draft' | 'canceled';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'mobile_banking' | 'other';
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const soldProductSchema = new Schema<ISoldProduct>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  barcode: {
    type: String,
    required: true,
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
  batches: {
    type: [
      {
        batchNo: { type: String, required: true },
        qty: { type: Number, required: true },
        expiryDate: { type: Date, required: true },
      },
    ],
    default: [],
  },
});

const saleSchema = new Schema<ISale>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    saleDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    products: {
      type: [soldProductSchema],
      required: true,
      validate: [(v: any[]) => v.length > 0, 'Sale must contain at least one product'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['paid', 'partial', 'unpaid'],
    },
    saleStatus: {
      type: String,
      required: true,
      enum: ['completed', 'draft', 'canceled'],
      default: 'completed',
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash', 'card', 'bank_transfer', 'mobile_banking', 'other'],
      default: 'cash',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

saleSchema.index({ invoiceNumber: 1 }, { unique: true });
saleSchema.index({ saleDate: -1 });

export const Sale = mongoose.model<ISale>('Sale', saleSchema);
