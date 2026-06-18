import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './db';
import { User } from '../modules/users/user.model';
import { Category } from '../modules/categories/category.model';
import { logger } from '../utils/logger';

async function seed() {
  await connectDB();

  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      logger.info('No admin user found. Creating default admin...');
      
      const admin = new User({
        name: 'Super Admin',
        email: 'admin@sellflow.local',
        passwordHash: 'admin123', // Will be hashed by pre-save hook
        role: 'admin',
      });
      
      await admin.save();
      logger.info('✅ Default admin created: admin@sellflow.local / admin123');
    } else {
      logger.info('Admin user already exists. Skipping seed.');
    }

    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      logger.info('No categories found. Seeding default categories...');
      const defaultCategories = ["Grocery", "Dairy", "Beverages", "Bakery", "Meat/Poultry", "Snacks", "Household"];
      for (const catName of defaultCategories) {
        await Category.create({ name: catName });
      }
      logger.info('✅ Default categories seeded.');
    } else {
      logger.info('Categories already exist. Skipping category seed.');
    }
  } catch (error) {
    logger.error('Error during seeding:', error);
  } finally {
    await disconnectDB();
  }
}

seed();
