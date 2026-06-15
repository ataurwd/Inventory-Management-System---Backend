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

describe('Dashboard Integration Tests', () => {
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

  describe('GET /api/v1/dashboard/stats', () => {
    it('should aggregate all stats correctly', async () => {
      // 1. Create a product that has low stock
      const milkExpiry = new Date();
      milkExpiry.setDate(milkExpiry.getDate() + 45); // far in the future
      const p1 = new Product({
        name: 'Milk',
        barcode: '1111111111111',
        category: 'Dairy',
        unit: 'Liters',
        costPrice: 1,
        sellingPrice: 2,
        safetyStockLevel: 5,
        batches: [{ batch_no: 'B1', qty: 2, expiry_date: milkExpiry }], // 2 < 5 safety limit
      });
      
      // 2. Create another product that is near expiry (e.g. 5 days from now)
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 5);
      const p2 = new Product({
        name: 'Bread',
        barcode: '2222222222222',
        category: 'Bakery',
        unit: 'Loaves',
        costPrice: 0.8,
        sellingPrice: 1.5,
        safetyStockLevel: 1,
        batches: [{ batch_no: 'B2', qty: 10, expiry_date: expiry }], // total 10 >= 1, but expires in 5 days
      });

      await p1.save();
      await p2.save();

      // 3. Create today sales
      const t1 = new Transaction({
        type: 'sale',
        productId: p1._id,
        batchNo: 'B1',
        qty: 3,
        unitPrice: 2.0,
        total: 6.0,
        performedBy: adminPayload.id,
        timestamp: new Date()
      });
      await t1.save();

      const response = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const stats = response.body.data;
      expect(stats.totalProducts).toBe(2);
      expect(stats.todayRevenue).toBe(6.0);
      expect(stats.totalLowStockAlerts).toBe(1); // Milk only
      expect(stats.totalExpiryAlerts).toBe(1); // Bread only
      expect(stats.weeklyRevenue).toHaveLength(7);
      
      // The last day in weeklyRevenue (today) should have 6.0 revenue
      expect(stats.weeklyRevenue[6].revenue).toBe(6.0);
    });

    it('should allow access to cashiers', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Cookie', `token=${cashierToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/dashboard/waste-risk', () => {
    it('should return batches expiring in less than 30 days', async () => {
      const expiryNear = new Date();
      expiryNear.setDate(expiryNear.getDate() + 10); // 10 days left

      const expiryFar = new Date();
      expiryFar.setDate(expiryFar.getDate() + 40); // 40 days left (excluded)

      const p1 = new Product({
        name: 'Yogurt',
        barcode: '123',
        category: 'Dairy',
        unit: 'Cups',
        costPrice: 0.5,
        sellingPrice: 1.0,
        batches: [
          { batch_no: 'SoonBatch', qty: 5, expiry_date: expiryNear },
          { batch_no: 'FarBatch', qty: 10, expiry_date: expiryFar },
        ]
      });
      await p1.save();

      const response = await request(app)
        .get('/api/v1/dashboard/waste-risk')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].batchNo).toBe('SoonBatch');
      expect(response.body.data[0].risk).toBe('high'); // 10 days <= 15 days is high
    });

    it('should deny access to cashiers', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/waste-risk')
        .set('Cookie', `token=${cashierToken}`);
      expect(response.status).toBe(403);
    });
  });
});
