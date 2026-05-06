import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { runMigrations } from './models/migrations';
import { runSeeds } from './models/seeds';
import { startScheduler } from './services/schedulerService';

// Routes
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import accountRoutes from './routes/accounts';
import categoryRoutes from './routes/categories';
import scanRoutes from './routes/scans';
import analyticsRoutes from './routes/analytics';
import reportRoutes from './routes/reports';
import budgetRoutes from './routes/budgets';
import importRoutes from './routes/import';
import recurringRoutes from './routes/recurring';
import savingsGoalRoutes from './routes/savingsGoals';
import currencyRoutes from './routes/currency';
import notificationRoutes from './routes/notifications';
import exportRoutes from './routes/export';

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const app = express();

// Standard middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts, please try again later.' },
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Serve uploaded files statically
app.use('/uploads', express.static(config.uploadDir));

// Public routes
app.use('/api/auth', authRoutes);

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Protected routes
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/scans', authMiddleware, scanRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/budgets', authMiddleware, budgetRoutes);
app.use('/api/transactions/import', authMiddleware, importRoutes);
app.use('/api/recurring', authMiddleware, recurringRoutes);
app.use('/api/savings-goals', authMiddleware, savingsGoalRoutes);
app.use('/api/currency', authMiddleware, currencyRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/export', authMiddleware, exportRoutes);

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Run migrations and seeds on startup
    await runMigrations();
    await runSeeds();

    // Start scheduled jobs
    if (config.nodeEnv === 'production') {
      startScheduler();
    }

    app.listen(config.port, () => {
      console.log(`PFMS API running on port ${config.port} (${config.nodeEnv})`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
