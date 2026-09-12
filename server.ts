import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

import healthRouter from './src/routes/health.ts';
import authRouter from './src/routes/auth.ts';
import gymRouter from './src/routes/gym.ts';
import membersRouter from './src/routes/members.ts';
import plansRouter from './src/routes/plans.ts';
import membershipsRouter from './src/routes/memberships.ts';
import paymentsRouter from './src/routes/payments.ts';
import expensesRouter from './src/routes/expenses.ts';
import notificationsRouter from './src/routes/notifications.ts';
import dashboardRouter from './src/routes/dashboard.ts';
import reportsRouter from './src/routes/reports.ts';
import searchRouter from './src/routes/search.ts';
import backupRouter from './src/routes/backup.ts';
import auditRouter from './src/routes/audit.ts';

import { seedDatabaseIfEmpty } from './src/db/seed.ts';
import { pool } from './src/db/index.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin SPA navigation)
      if (!origin) {
        return callback(null, true);
      }
      
      const allowedOriginPatterns = [
        /\.run\.app$/,
        /\.google\.com$/,
        /\.aistudio\.google$/,
        /^https?:\/\/localhost(:[0-9]+)?$/,
        /^https?:\/\/127\.0\.0\.1(:[0-9]+)?$/,
      ];

      const isAllowed = allowedOriginPatterns.some(pattern => pattern.test(origin));
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy: Access denied for origin ' + origin));
      }
    },
    credentials: true,
  }));
  app.use(express.json());

  // Top-level Health Checks
  app.use('/', healthRouter);
  app.use('/api', healthRouter);

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/gym', gymRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/memberships', membershipsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/backup', backupRouter);
  app.use('/api/audit', auditRouter);

  // 404 handler for unknown /api routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API endpoint not found' } });
  });

  // Centralized API error handler
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(err.status || 500).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected server error occurred',
      }
    });
  });

  // Vite Middleware for Frontend Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[Gym Manager] Server listening on port ${PORT}`);
    // Run idempotent database seed check
    try {
      await seedDatabaseIfEmpty();
    } catch (seedErr) {
      console.warn('Initial seed deferred or skipped:', seedErr);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down server gracefully...');
    server.close(async () => {
      try {
        await pool.end();
      } catch (e) {
        // ignore
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
