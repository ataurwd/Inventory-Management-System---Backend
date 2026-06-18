import mongoose from 'mongoose';
import { User } from '../modules/users/user.model';
import { env } from '../config/env';

async function makeAdmin() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to DB');

    const email = 'ataur.exprovia@gmail.com';
    let user = await User.findOne({ email });

    if (!user) {
      console.log('User not found, creating new admin user...');
      user = new User({
        name: 'Ataur Rahman',
        email,
        passwordHash: 'dummy_password_hash_since_we_use_firebase',
        role: 'admin',
        isActive: true,
      });
      await user.save();
      console.log('Created new admin user successfully!');
    } else {
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      console.log('Updated existing user to admin successfully!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

makeAdmin();
