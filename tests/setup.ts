import mongoose from 'mongoose';

beforeAll(async () => {
  // mongodb-memory-server will be configured per test file
});

afterAll(async () => {
  await mongoose.connection.close();
});
