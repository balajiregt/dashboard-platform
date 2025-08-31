const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');
const { logger } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Import routes
const testReportsRoutes = require('./routes/testReports');
const analyticsRoutes = require('./routes/analytics');
const projectsRoutes = require('./routes/projects');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const usersRoutes = require('./routes/users');
const teamResultsRoutes = require('./routes/teamResults');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/api/v1/test-reports', testReportsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/team-results', teamResultsRoutes);

// Serve static files (for uploaded test artifacts)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize SQLite database
        await initializeDatabase();

        // Start the server
        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📊 Health check: http://localhost:${PORT}/health`);
            logger.info(`🔗 API base URL: http://localhost:${PORT}/api/v1`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
