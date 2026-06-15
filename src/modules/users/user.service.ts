import { User, IUser } from './user.model';

export async function findByEmail(email: string): Promise<IUser | null> {
  return User.findOne({ email, isActive: true }).select('+passwordHash');
}

export async function findById(id: string): Promise<IUser | null> {
  return User.findById(id).where({ isActive: true });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'cashier';
}): Promise<IUser> {
  const user = new User({
    name: data.name,
    email: data.email,
    passwordHash: data.password, // pre-save hook will hash it
    role: data.role,
  });
  return user.save();
}

export async function updateLastLogin(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
}

export async function getUserCount(): Promise<number> {
  return User.countDocuments();
}

export async function getAllUsers(): Promise<IUser[]> {
  return User.find({ isActive: true }).select('-passwordHash').sort({ createdAt: -1 });
}
