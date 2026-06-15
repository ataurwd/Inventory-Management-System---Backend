import request from 'supertest';
import { createApp } from '../../src/app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Product } from '../../src/modules/products/product.model';
import { User } from '../../src/modules/users/user.model';
import { Transaction } from '../../src/modules/transactions/transaction.model';
import { signAccessToken } from '../../src/modules/auth/auth.service';

let mongoServer: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Product.deleteMany({});
  await User.deleteMany({});
  await Transaction.deleteMany({});
});

describe('Transaction Routes Integration Tests', () => {
  const adminPayload = {
    id: new mongoose.Types.ObjectId().toString(),
    email: 'admin@test.com',
    role: 'admin' as const,
    name: 'Admin User',
  };

  const cashierPayload = {
    id: new mongoose.Types.ObjectId().toString(),
    email: 'cashier@test.com',
    role: 'cashier' as const,
    name: 'Cashier User',
  };

  const adminToken = signAccessToken(adminPayload);
  const cashierToken = signAccessToken(cashierPayload);

  describe('GET /api/v1/transactions', () => {
    it('should fetch paginated transactions for admin', async () => {
      const product = new Product({
        name: 'Product A',
        barcode: '123',
        category: 'Misc',
        unit: 'Pcs',
        costPrice: 5,
        sellingPrice: 10,
      });
      await product.save();

      const transaction = new Transaction({
        type: 'sale',
        productId: product._id,
        batchNo: 'B1',
        qty: 2,
        unitPrice: 10,
        total: 20,
        performedBy: adminPayload.id,
      });
      await transaction.save();

      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.total).toBe(1);
    });

    it('should deny cashier from fetching transaction list', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Cookie', `token=${cashierToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/transactions/summary', () => {
    it('should return correct summary values', async () => {
      const product = new Product({
        name: 'Product A',
        barcode: '123',
        category: 'Misc',
        unit: 'Pcs',
        costPrice: 5,
        sellingPrice: 10,
      });
      await product.save();

      const transaction = new Transaction({
        type: 'sale',
        productId: product._id,
        batchNo: 'B1',
        qty: 3,
        unitPrice: 10,
        total: 30, // 3 * 10
        performedBy: adminPayload.id,
      });
      await transaction.save();

      const response = await request(app)
        .get('/api/v1/transactions/summary')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const summary = response.body.data;
      expect(summary.totalRevenue).toBe(30.0);
      expect(summary.totalCost).toBe(15.0); // 3 * 5
      expect(summary.netProfit).toBe(15.0); // 30 - 15
      expect(summary.transactionCount).toBe(1);
    });
  });

  describe('GET /api/v1/transactions/product/:productId', () => {
    it('should allow all authenticated roles to fetch a specific product transactions', async () => {
      const productId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/transactions/product/${productId}`)
        .set('Cookie', `token=${cashierToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/transactions/report', () => {
    it('should fetch report data for admin', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/report')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data).toHaveProperty('waste');
    });

    it('should deny cashier from fetching report data', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/report')
        .set('Cookie', `token=${cashierToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/products/:id/batches/:batchNo - Waste transaction logging', () => {
    it('should log a waste transaction when a batch is removed', async () => {
      const product = new Product({
        name: 'Product Waste Test',
        barcode: '999',
        category: 'Food',
        unit: 'Pcs',
        costPrice: 4.50,
        sellingPrice: 8.00,
        batches: [
          {
            batch_no: 'B_WASTE',
            qty: 10,
            expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          }
        ]
      });
      await product.save();

      const response = await request(app)
        .delete(`/api/v1/products/${product._id}/batches/B_WASTE`)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);

      const tx = await Transaction.findOne({ productId: product._id, type: 'waste' });
      expect(tx).not.toBeNull();
      expect(tx!.qty).toBe(10);
      expect(tx!.unitPrice).toBe(4.50);
      expect(tx!.total).toBe(45.00);
      expect(tx!.performedBy.toString()).toBe(adminPayload.id);
    });
  });
});
