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
  // Ensure we are disconnected before connecting
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

describe('Inventory Integration Tests', () => {
  const mockUserPayload = {
    id: new mongoose.Types.ObjectId().toString(),
    email: 'cashier@test.com',
    role: 'cashier' as const,
    name: 'Test Cashier',
  };

  const token = signAccessToken(mockUserPayload);

  describe('POST /api/v1/inventory/scan-sell', () => {
    it('should deduct stock using FIFO and create transactions', async () => {
      // Create a test product with two batches expiring at different times
      const expiry1 = new Date();
      expiry1.setDate(expiry1.getDate() + 5); // expires in 5 days (older)
      
      const expiry2 = new Date();
      expiry2.setDate(expiry2.getDate() + 20); // expires in 20 days (newer)

      const product = new Product({
        name: 'Test Milk',
        barcode: '1234567890123',
        category: 'Dairy',
        unit: 'Liters',
        costPrice: 1.5,
        sellingPrice: 3.0,
        safetyStockLevel: 5,
        batches: [
          { batch_no: 'B2', qty: 10, expiry_date: expiry2 },
          { batch_no: 'B1', qty: 5, expiry_date: expiry1 }, // older batch first in FIFO
        ],
      });
      await product.save();

      const response = await request(app)
        .post('/api/v1/inventory/scan-sell')
        .set('Cookie', `token=${token}`)
        .send({ barcode: '1234567890123', qty: 7 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.lowStockAlert).toBe(false); // 15 - 7 = 8 total stock remaining, which is > 5 safety level

      // Verify product batches updated in DB
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct).toBeDefined();
      // B1 (qty 5) should be completely deducted and removed
      // B2 (qty 10) should have 2 deducted, leaving 8
      expect(updatedProduct!.batches).toHaveLength(1);
      expect(updatedProduct!.batches[0].batch_no).toBe('B2');
      expect(updatedProduct!.batches[0].qty).toBe(8);

      // Verify transaction documents created in DB
      const transactions = await Transaction.find({ productId: product._id });
      expect(transactions).toHaveLength(2);
      
      const t1 = transactions.find((t) => t.batchNo === 'B1');
      const t2 = transactions.find((t) => t.batchNo === 'B2');
      
      expect(t1).toBeDefined();
      expect(t1!.qty).toBe(5);
      expect(t1!.type).toBe('sale');
      expect(t1!.unitPrice).toBe(3.0);
      expect(t1!.total).toBe(15.0);
      expect(t1!.performedBy.toString()).toBe(mockUserPayload.id);

      expect(t2).toBeDefined();
      expect(t2!.qty).toBe(2);
      expect(t2!.type).toBe('sale');
      expect(t2!.unitPrice).toBe(3.0);
      expect(t2!.total).toBe(6.0);
    });

    it('should return lowStockAlert true if new total stock falls below safetyStockLevel', async () => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 10);

      const product = new Product({
        name: 'Test Bread',
        barcode: '9876543210987',
        category: 'Bakery',
        unit: 'Loaves',
        costPrice: 1.0,
        sellingPrice: 2.0,
        safetyStockLevel: 5,
        batches: [
          { batch_no: 'B1', qty: 6, expiry_date: expiry },
        ],
      });
      await product.save();

      const response = await request(app)
        .post('/api/v1/inventory/scan-sell')
        .set('Cookie', `token=${token}`)
        .send({ barcode: '9876543210987', qty: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.lowStockAlert).toBe(true); // 6 - 2 = 4 total stock remaining, which is < 5 safety level
    });

    it('should return 400 bad request if stock is insufficient', async () => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 10);

      const product = new Product({
        name: 'Test Bread',
        barcode: '9876543210987',
        category: 'Bakery',
        unit: 'Loaves',
        costPrice: 1.0,
        sellingPrice: 2.0,
        safetyStockLevel: 5,
        batches: [
          { batch_no: 'B1', qty: 3, expiry_date: expiry },
        ],
      });
      await product.save();

      const response = await request(app)
        .post('/api/v1/inventory/scan-sell')
        .set('Cookie', `token=${token}`)
        .send({ barcode: '9876543210987', qty: 5 });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Insufficient stock');
    });

    it('should return 404 if product is not found', async () => {
      const response = await request(app)
        .post('/api/v1/inventory/scan-sell')
        .set('Cookie', `token=${token}`)
        .send({ barcode: '9999999999999', qty: 1 });

      expect(response.status).toBe(404);
    });

    it('should return 401 unauthorized if token cookie is missing', async () => {
      const response = await request(app)
        .post('/api/v1/inventory/scan-sell')
        .send({ barcode: '1234567890123', qty: 1 });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/inventory/low-stock', () => {
    it('should return products below safety level', async () => {
      const p1 = new Product({
        name: 'Low Stock Product',
        barcode: '1111111111111',
        category: 'Misc',
        unit: 'Units',
        costPrice: 5,
        sellingPrice: 10,
        safetyStockLevel: 10,
        batches: [{ batch_no: 'B1', qty: 3, expiry_date: new Date() }], // total 3 < 10 safety level
      });
      const p2 = new Product({
        name: 'Good Stock Product',
        barcode: '2222222222222',
        category: 'Misc',
        unit: 'Units',
        costPrice: 5,
        sellingPrice: 10,
        safetyStockLevel: 10,
        batches: [{ batch_no: 'B1', qty: 15, expiry_date: new Date() }], // total 15 >= 10 safety level
      });

      await p1.save();
      await p2.save();

      const response = await request(app)
        .get('/api/v1/inventory/low-stock')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Low Stock Product');
    });
  });

  describe('GET /api/v1/inventory/expiry-alerts', () => {
    it('should return batches expiring in less than or equal to 15 days', async () => {
      const expiringSoon = new Date();
      expiringSoon.setDate(expiringSoon.getDate() + 5); // expires in 5 days (soon)

      const expiringLater = new Date();
      expiringLater.setDate(expiringLater.getDate() + 45); // expires in 45 days (not soon)

      const p = new Product({
        name: 'Product Expiry Test',
        barcode: '3333333333333',
        category: 'Misc',
        unit: 'Units',
        costPrice: 5,
        sellingPrice: 10,
        batches: [
          { batch_no: 'SoonBatch', qty: 5, expiry_date: expiringSoon },
          { batch_no: 'LateBatch', qty: 10, expiry_date: expiringLater },
        ],
      });
      await p.save();

      const response = await request(app)
        .get('/api/v1/inventory/expiry-alerts')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].batchNo).toBe('SoonBatch');
      expect(response.body.data[0].productName).toBe('Product Expiry Test');
    });
  });
});
