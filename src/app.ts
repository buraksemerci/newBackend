import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, connectDatabase, disconnectDatabase, logger } from './config/index.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/index.js';
import { setupCleanupJob } from './jobs/cleanup.job.js';

// Import routes
import publicRoutes from './modules/public/public.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/user/user.routes.js';
import deviceRoutes from './modules/device/device.routes.js';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOrigin = env.ALLOWED_ORIGINS === '*'
    ? '*'
    : env.ALLOWED_ORIGINS.split(',').map(o => o.trim());

app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: env.ALLOWED_ORIGINS !== '*', // Enable credentials for specific origins
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API Routes
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/devices', deviceRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    await disconnectDatabase();
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDatabase();

        // Setup cleanup job
        setupCleanupJob();

        // Start listening
        app.listen(env.PORT, () => {
            logger.info(`🚀 Server running on port ${env.PORT}`);
            logger.info(`📊 Environment: ${env.NODE_ENV}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export default app;
