const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Startup Environment Variable Validation
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingRequired = requiredEnvVars.filter((key) => !process.env[key]);
if (missingRequired.length > 0) {
  console.error(`[Server Config Error] Missing critical environment variables: ${missingRequired.join(', ')}`);
}

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const folderRoutes = require('./routes/folderRoutes');
const shareRoutes = require('./routes/shareRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Trust reverse proxy for HTTPS header resolution
app.set('trust proxy', 1);

// Connect to MongoDB Atlas
connectDB();

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Mobile & Web CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow mobile apps, curl, native agents, and web clients
      if (!origin) return callback(null, true);
      return callback(null, origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  const { getDBStatus } = require('./config/db');
  res.status(200).json({
    success: true,
    status: 'ok',
    message: 'PaperlessDoc API is running',
    version: '1.0.0',
    database: getDBStatus(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
