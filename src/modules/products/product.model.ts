import mongoose, { Schema, Document } from 'mongoose';

export interface IBatch {
  batch_no: string;
  qty: number;
  expiry_date: Date;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  barcode: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  safetyStockLevel: number;
  supplierId: mongoose.Types.ObjectId | null;
  batches: IBatch[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const batchSchema = new Schema<IBatch>({
  batch_no: {
    type: String,
    required: [true, 'Batch number is required'],
    trim: true,
  },
  qty: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0,
  },
  expiry_date: {
    type: Date,
    required: [true, 'Expiry date is required'],
  },
});

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    barcode: {
      type: String,
      required: [true, 'Barcode is required'],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    safetyStockLevel: {
      type: Number,
      required: [true, 'Safety stock level is required'],
      min: [0, 'Safety stock level cannot be negative'],
      default: 0,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    batches: {
      type: [batchSchema],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
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

// Add unique index on barcode
productSchema.index({ barcode: 1 }, { unique: true });

export const Product = mongoose.model<IProduct>('Product', productSchema);
