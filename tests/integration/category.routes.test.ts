import request from 'supertest';
import { createApp } from '../../src/app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Category } from '../../src/modules/categories/category.model';
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
  await Category.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});
});

describe('Category Routes Integration Tests', () => {
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

  describe('GET /api/v1/categories', () => {
    it('should allow all authenticated roles to fetch categories list', async () => {
      const cat = new Category({ name: 'Seeded Category' });
      await cat.save();

      const response = await request(app)
        .get('/api/v1/categories')
        .set('Cookie', `token=${cashierToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Seeded Category');
    });
  });

  describe('POST /api/v1/categories', () => {
    it('should allow admin to create a category', async () => {
      const response = await request(app)
        .post('/api/v1/categories')
        .set('Cookie', `token=${adminToken}`)
        .send({ name: 'New Category' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Category');

      const saved = await Category.findOne({ name: 'New Category' });
      expect(saved).not.toBeNull();
    });

    it('should allow cashier to create a category', async () => {
      const response = await request(app)
        .post('/api/v1/categories')
        .set('Cookie', `token=${cashierToken}`)
        .send({ name: 'Cashier Category' });

      expect(response.status).toBe(201);
    });

    it('should throw conflict if category name exists', async () => {
      const cat = new Category({ name: 'Duplicate' });
      await cat.save();

      const response = await request(app)
        .post('/api/v1/categories')
        .set('Cookie', `token=${adminToken}`)
        .send({ name: 'Duplicate' });

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /api/v1/categories/:id', () => {
    it('should update category and cascade to products', async () => {
      const cat = new Category({ name: 'Dairy' });
      await cat.save();

      const product = new Product({
        name: 'Milk Powder',
        barcode: '12345678',
        category: 'Dairy',
        unit: 'Pcs',
        costPrice: 5,
        sellingPrice: 10,
      });
      await product.save();

      const response = await request(app)
        .put(`/api/v1/categories/${cat._id}`)
        .set('Cookie', `token=${adminToken}`)
        .send({ name: 'Dairy Products' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Dairy Products');

      // Verify product's category cascaded
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct!.category).toBe('Dairy Products');
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('should block deletion if category is assigned to products', async () => {
      const cat = new Category({ name: 'Snacks' });
      await cat.save();

      const product = new Product({
        name: 'Chips',
        barcode: 'chips123',
        category: 'Snacks',
        unit: 'Bag',
        costPrice: 1,
        sellingPrice: 2,
      });
      await product.save();

      const response = await request(app)
        .delete(`/api/v1/categories/${cat._id}`)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(400); // Bad Request because products exist
      expect(response.body.error.message).toContain('Cannot delete category');

      const stillExists = await Category.findById(cat._id);
      expect(stillExists).not.toBeNull();
    });

    it('should delete category if no products are assigned', async () => {
      const cat = new Category({ name: 'Empty Category' });
      await cat.save();

      const response = await request(app)
        .delete(`/api/v1/categories/${cat._id}`)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);

      const deleted = await Category.findById(cat._id);
      expect(deleted).toBeNull();
    });
  });
});
