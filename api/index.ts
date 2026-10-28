import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';

// Create Express app instance
const app = createApp();

// Establish MongoDB connection 
connectDB();

export default app;
