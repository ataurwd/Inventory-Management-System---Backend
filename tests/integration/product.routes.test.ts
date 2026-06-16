import request from 'supertest';
import { createApp } from '../../src/app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Product } from '../../src/modules/products/product.model';
import { User } from '../../src/modules/users/user.model';
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
});

describe('Product Routes Integration Tests', () => {
  const cashierPayload = {
    id: new mongoose.Types.ObjectId().toString(),
    email: 'cashier@test.com',
    role: 'cashier' as const,
    name: 'Cashier User',
  };

  const cashierToken = signAccessToken(cashierPayload);

  describe('GET /api/v1/products', () => {
    it('should list all products', async () => {
      const p1 = new Product({
        name: 'Product A',
        barcode: 'barcodea1',
        category: 'Grocery',
        unit: 'Pcs',
        costPrice: 5,
        sellingPrice: 10,
        brand: 'BrandX',
      });
      await p1.save();

      const response = await request(app)
        .get('/api/v1/products')
        .set('Cookie', `token=${cashierToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Product A');
    });

    it('should filter products by brand', async () => {
      const p1 = new Product({
        name: 'Product Brand X',
        barcode: 'barcode1',
        category: 'Grocery',
        unit: 'Pcs',
        costPrice: 5,
        sellingPrice: 10,
        brand: 'BrandX',
      });
      const p2 = new Product({
        name: 'Product Brand Y',
        barcode: 'barcode2',
        category: 'Grocery',
        unit: 'Pcs',
        costPrice: 5,
        sellingPrice: 10,
        brand: 'BrandY',
      });
      await p1.save();
      await p2.save();

      const response = await request(app)
        .get('/api/v1/products')
        .query({ brand: 'BrandX' })
        .set('Cookie', `token=${cashierToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Product Brand X');
      expect(response.body.data[0].brand).toBe('BrandX');
    });
  });
});
