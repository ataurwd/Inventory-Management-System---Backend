import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';

// Create Express app instance
const app = createApp();

// Establish MongoDB connection in serverless context
connectDB();

export default app;
