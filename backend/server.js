import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { connectDB } from './src/config/database.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import { initializeSocket, notifyNewEvaluation } from './src/config/socket.js';
import authRoutes from './src/routes/auth.js';
import teachersRoutes from './src/routes/teachers.js';
import evaluationsRoutes from './src/routes/evaluations.js';
import questionsRoutes from './src/routes/questions.js';
import usersRoutes from './src/routes/users.js';
import analyticsRoutes from './src/routes/analytics.js';
import departmentsRoutes from './src/routes/departments.js';
import surveysRoutes from './src/routes/surveys.js';
import uploadRoutes from './src/routes/upload.js';
import settingsRoutes from './src/routes/settings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../storage/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Connect to database
await connectDB();

// Create HTTP server for Socket.IO
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Store io instance in app for routes to access
app.locals.io = io;

// Middleware
const defaultOrigins = [
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:5173',
  'http://192.168.1.187:5173',
  'https://fullbright.vercel.app',
  'https://evaluation-backend-kaah.onrender.com'
];

const corsOrigins = process.env.CORS_ORIGINS 
  ? [...new Set([...process.env.CORS_ORIGINS.split(',').map(o => o.trim()), ...defaultOrigins])]
  : defaultOrigins;

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: true,
  saveUninitialized: true,
  store: new MongoStore({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
  }),
  cookie: {
    httpOnly: true,
    secure: false, // Set to false for development with HTTP
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/evaluations', evaluationsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/surveys', surveysRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Teacher Evaluation API is running' });
});

// Error handling middleware
app.use(errorHandler);

// Start server with Socket.IO
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO listening on ws://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
